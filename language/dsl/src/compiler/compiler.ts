import React from 'react';
import type { JsonType } from 'react-json-reconciler';
import { SourceMapGenerator, SourceMapConsumer } from 'source-map-js';
import { render } from 'react-json-reconciler';
import type { Flow, View, Navigation as PlayerNav } from '@player-ui/types';
import {
  AsyncSeriesHook,
  AsyncSeriesWaterfallHook,
  SyncHook,
} from 'tapable-ts';
import { fingerprintContent } from './utils';
import type {
  LoggingInterface,
  CompilerReturn,
  SerializeContext,
} from './types';
import type { Navigation } from '../types';
import { SchemaGenerator } from './schema';

/**
 * Argument passed to the DSLCompiler onEnd hook
 * Defined as an object so additional fields can be added later without breaking API
 * */
export interface OnEndArg {
  /** target output directory **/
  output: string;
}

/** Recursively find BindingTemplateInstance and call toValue on them */
const parseNavigationExpressions = (nav: Navigation): PlayerNav => {
  /** Same as above but signature changed */
  function replaceExpWithStr(obj: any): any {
    /** call toValue if BindingTemplateInstance otherwise continue  */
    function convExp(value: any): any {
      return value && typeof value === 'object' && value.__type === 'expression'
        ? value.toValue() // exp, onStart, and onEnd don't need to be wrapped in @[]@
        : replaceExpWithStr(value);
    }

    if (Array.isArray(obj)) {
      return obj.map(convExp);
    }

    if (typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, convExp(value)])
      );
    }

    return obj;
  }

  return replaceExpWithStr(nav);
};

type SourceMapList = Array<{
  /** The mappings of the original */
  sourceMap: string;
  /**
   * The id of the view we're indexing off of
   * This should be a unique global identifier within the generated code
   * e.g. `"id": "view_0",`
   */
  offsetIndexSearch: string;
  /** The generated source that produced the map */
  source: string;
}>;

/** Given a list of source maps for all generated views, merge them into 1 */
const mergeSourceMaps = (
  sourceMaps: SourceMapList,
  generated: string
): string => {
  const generator = new SourceMapGenerator();
  sourceMaps.forEach(({ sourceMap, offsetIndexSearch, source }) => {
    const generatedLineOffset = generated
      .split('\n')
      .findIndex((line) => line.includes(offsetIndexSearch));

    const sourceLineOffset = source
      .split('\n')
      .findIndex((line) => line.includes(offsetIndexSearch));

    const lineOffset = generatedLineOffset - sourceLineOffset;

    const generatedLine = generated.split('\n')[generatedLineOffset];
    const sourceLine = source.split('\n')[sourceLineOffset];

    const generatedColumn = generatedLine.indexOf(offsetIndexSearch);
    const sourceColumn = sourceLine.indexOf(offsetIndexSearch);
    const columnOffset = generatedColumn - sourceColumn;

    const consumer = new SourceMapConsumer(JSON.parse(sourceMap));
    consumer.eachMapping((mapping) => {
      generator.addMapping({
        generated: {
          line: mapping.generatedLine + lineOffset,
          column: mapping.generatedColumn + columnOffset,
        },
        original: {
          line: mapping.originalLine,
          column: mapping.originalColumn,
        },
        source: mapping.source,
      });
    });
  });

  return generator.toString();
};

/** A compiler for transforming DSL content into JSON */
export class DSLCompiler {
  public readonly logger: LoggingInterface;
  public hooks = {
    // Hook to access the schema generator instance when initialized
    schemaGenerator: new SyncHook<[SchemaGenerator]>(),
    // Hook to access pre-compilation object
    preProcessFlow: new AsyncSeriesWaterfallHook<[object]>(),
    // Hook to access post-compilation Flow before output is written
    postProcessFlow: new AsyncSeriesWaterfallHook<[Flow]>(),
    // Hook called after all files are compiled. Revives the output directory
    onEnd: new AsyncSeriesHook<[OnEndArg]>(),
  };

  private schemaGenerator?: SchemaGenerator;

  constructor(logger?: LoggingInterface) {
    this.logger = logger ?? console;
  }

  /** Convert an object (flow, view, schema, etc) into it's JSON representation */
  async serialize(
    value: unknown,
    context?: SerializeContext
  ): Promise<CompilerReturn | undefined> {
    if (typeof value !== 'object' || value === null) {
      throw new Error('Unable to serialize non-object');
    }

    const type = context?.type ? context.type : fingerprintContent(value);

    if (!this.schemaGenerator) {
      this.schemaGenerator = new SchemaGenerator(this.logger);
      this.hooks.schemaGenerator.call(this.schemaGenerator);
    }

    const schemaGenerator = new SchemaGenerator(this.logger);
    this.hooks.schemaGenerator.call(schemaGenerator);

    if (type === 'view') {
      const { jsonValue, sourceMap } = await render(value, {
        collectSourceMap: true,
      });

      return {
        value: jsonValue,
        sourceMap,
      };
    }

    if (type === 'flow') {
      // Source maps from all the nested views
      // Merge these together before returning
      const allSourceMaps: SourceMapList = [];

      // Assume this is a flow
      const copiedValue: Flow = {
        ...(value as any),
      };

      copiedValue.views = (await Promise.all(
        copiedValue?.views?.map(async (node: any) => {
          if (React.isValidElement(node)) {
            const { jsonValue, sourceMap, stringValue } = await render(node, {
              collectSourceMap: true,
            });

            if (sourceMap) {
              // Find the line that is the id of the view
              // Use that as the identifier for the sourcemap offset calc
              const searchIdLine = stringValue
                .split('\n')
                .find((line) =>
                  line.includes(
                    `"id": "${(jsonValue as Record<string, string>).id}"`
                  )
                );

              if (searchIdLine) {
                allSourceMaps.push({
                  sourceMap,
                  offsetIndexSearch: searchIdLine,
                  source: stringValue,
                });
              }
            }

            return jsonValue;
          }

          return node;
        }) ?? []
      )) as View[];

      // Go through the flow and sub out any view refs that are react elements w/ the right id
      if ('navigation' in value) {
        Object.entries((value as Flow).navigation).forEach(([navKey, node]) => {
          if (typeof node === 'object') {
            Object.entries(node).forEach(([nodeKey, flowNode]) => {
              if (
                flowNode &&
                typeof flowNode === 'object' &&
                'state_type' in flowNode &&
                flowNode.state_type === 'VIEW' &&
                React.isValidElement(flowNode.ref)
              ) {
                const actualViewIndex = (value as Flow).views?.indexOf?.(
                  flowNode.ref as any
                );

                if (actualViewIndex !== undefined && actualViewIndex > -1) {
                  const actualId = copiedValue.views?.[actualViewIndex]?.id;

                  (copiedValue as any).navigation[navKey][nodeKey].ref =
                    actualId;
                }
              }
            });
          }
        });

        if ('schema' in copiedValue) {
          copiedValue.schema = this.schemaGenerator.toSchema(copiedValue.schema);
        }

        copiedValue.navigation = parseNavigationExpressions(
          copiedValue.navigation
        );
      }

      if (value) {
        const postProcessFlow = await this.hooks.postProcessFlow.call(
          copiedValue
        );

        return {
          value: postProcessFlow as JsonType,
          sourceMap: mergeSourceMaps(
            allSourceMaps,
            JSON.stringify(copiedValue, null, 2)
          ),
        };
      }
    }

    if (type === 'schema') {
      return {
        value: this.schemaGenerator.toSchema(value) as JsonType,
      };
    }

    throw Error('DSL Compiler Error: Unable to determine type to compile as');
  }
}
