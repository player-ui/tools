package com.intuit.playertools.fluent.generator

import java.io.File
import kotlin.system.exitProcess

/**
 * CLI entry point for the Kotlin DSL generator.
 *
 * Usage:
 * ```
 * kotlin-dsl-generator --input <xlr-files> --output <output-dir> --package <package-name>
 * ```
 *
 * Arguments:
 * - --input, -i: Path to XLR JSON file(s) or directory containing XLR files
 * - --output, -o: Output directory for generated Kotlin files
 * - --package, -p: Package name for generated classes
 * - --help, -h: Show help message
 */
fun main(args: Array<String>) {
    val parsedArgs = parseArgs(args)

    if (parsedArgs.showHelp || parsedArgs.inputPaths.isEmpty()) {
        printHelp()
        return
    }

    if (parsedArgs.outputDir == null) {
        System.err.println("Error: Output directory is required. Use --output or -o.")
        exitProcess(1)
        return
    }

    if (parsedArgs.packageName == null) {
        System.err.println("Error: Package name is required. Use --package or -p.")
        exitProcess(1)
        return
    }

    val config =
        GeneratorConfig(
            packageName = parsedArgs.packageName,
            outputDir = parsedArgs.outputDir,
        )

    val generator = Generator(config)
    val inputFiles = collectInputFiles(parsedArgs.inputPaths)

    if (inputFiles.isEmpty()) {
        System.err.println("Error: No XLR JSON files found in the specified input paths.")
        exitProcess(1)
        return
    }

    println("Generating Kotlin DSL builders...")
    println("  Package: ${config.packageName}")
    println("  Output: ${config.outputDir.absolutePath}")
    println("  Files: ${inputFiles.size}")

    var successCount = 0
    var errorCount = 0

    inputFiles.forEach { file ->
        try {
            val result = generator.generateFromFile(file)
            println("  Generated: ${result.className} -> ${result.filePath.absolutePath}")
            successCount++
        } catch (e: Exception) {
            System.err.println("  Error processing ${file.name}: ${e.message}")
            errorCount++
        }
    }

    println()
    println("Generation complete: $successCount succeeded, $errorCount failed")

    if (errorCount > 0) {
        exitProcess(1)
    }
}

private data class ParsedArgs(
    val inputPaths: List<File> = emptyList(),
    val outputDir: File? = null,
    val packageName: String? = null,
    val showHelp: Boolean = false,
)

private fun parseArgs(args: Array<String>): ParsedArgs {
    var inputPaths = mutableListOf<File>()
    var outputDir: File? = null
    var packageName: String? = null
    var showHelp = false

    var i = 0
    while (i < args.size) {
        when (args[i]) {
            "--help", "-h" -> {
                showHelp = true
            }

            "--input", "-i" -> {
                i++
                if (i < args.size) {
                    inputPaths.add(File(args[i]))
                }
            }

            "--output", "-o" -> {
                i++
                if (i < args.size) {
                    outputDir = File(args[i])
                }
            }

            "--package", "-p" -> {
                i++
                if (i < args.size) {
                    packageName = args[i]
                }
            }

            else -> {
                // Treat unknown args as input files
                if (!args[i].startsWith("-")) {
                    inputPaths.add(File(args[i]))
                }
            }
        }
        i++
    }

    return ParsedArgs(inputPaths, outputDir, packageName, showHelp)
}

private fun collectInputFiles(paths: List<File>): List<File> {
    val result = mutableListOf<File>()

    paths.forEach { path ->
        when {
            path.isDirectory -> {
                path
                    .walkTopDown()
                    .filter { it.isFile && it.extension == "json" }
                    .forEach { result.add(it) }
            }

            path.isFile && path.extension == "json" -> {
                result.add(path)
            }
        }
    }

    return result
}

private fun printHelp() {
    println(
        """
        |Kotlin DSL Generator
        |
        |Generates Kotlin DSL builder classes from XLR JSON schemas.
        |
        |Usage:
        |  kotlin-dsl-generator [options] [input-files...]
        |
        |Options:
        |  -i, --input <path>    Path to XLR JSON file or directory (can be specified multiple times)
        |  -o, --output <dir>    Output directory for generated Kotlin files (required)
        |  -p, --package <name>  Package name for generated classes (required)
        |  -h, --help            Show this help message
        |
        |Examples:
        |  kotlin-dsl-generator -i ActionAsset.json -o generated -p com.example.builders
        |  kotlin-dsl-generator -i xlr/ -o generated -p com.myapp.fluent
        |  kotlin-dsl-generator ActionAsset.json TextAsset.json -o out -p com.test
        """.trimMargin(),
    )
}
