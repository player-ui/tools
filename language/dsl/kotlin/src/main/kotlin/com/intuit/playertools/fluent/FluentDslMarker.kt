package com.intuit.playertools.fluent

/**
 * DSL marker to prevent scope leakage in nested builder blocks.
 * This ensures that methods from outer builders are not accessible
 * in nested builder scopes, preventing accidental property assignments
 * to the wrong builder.
 */
@DslMarker
@Target(AnnotationTarget.CLASS, AnnotationTarget.TYPE)
annotation class FluentDslMarker
