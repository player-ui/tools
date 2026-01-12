package com.intuit.playertools.fluent.generator

import com.intuit.playertools.fluent.generator.xlr.XlrDeserializer
import com.intuit.playertools.fluent.generator.xlr.XlrDocument
import java.io.File

/**
 * Configuration for the Kotlin DSL generator.
 */
data class GeneratorConfig(
    val packageName: String,
    val outputDir: File
)

/**
 * Result of generating a single file.
 */
data class GeneratorResult(
    val className: String,
    val filePath: File,
    val code: String
)

/**
 * Main orchestrator for generating Kotlin DSL builders from XLR schemas.
 *
 * Usage:
 * ```kotlin
 * val generator = Generator(GeneratorConfig(
 *     packageName = "com.example.builders",
 *     outputDir = File("generated")
 * ))
 * val results = generator.generateFromFiles(listOf(File("ActionAsset.json")))
 * ```
 */
class Generator(
    private val config: GeneratorConfig
) {
    /**
     * Generate Kotlin builders from a list of XLR JSON files.
     */
    fun generateFromFiles(files: List<File>): List<GeneratorResult> =
        files.map { file ->
            generateFromFile(file)
        }

    /**
     * Generate a Kotlin builder from a single XLR JSON file.
     */
    fun generateFromFile(file: File): GeneratorResult {
        val jsonContent = file.readText()
        return generateFromJson(jsonContent, file.nameWithoutExtension)
    }

    /**
     * Generate a Kotlin builder from XLR JSON content.
     */
    fun generateFromJson(jsonContent: String, sourceName: String = "Unknown"): GeneratorResult {
        val document = XlrDeserializer.deserialize(jsonContent)
        return generateFromDocument(document)
    }

    /**
     * Generate a Kotlin builder from an XLR document.
     */
    fun generateFromDocument(document: XlrDocument): GeneratorResult {
        val generatedClass = ClassGenerator.generate(document, config.packageName)

        // Create output directory if it doesn't exist
        config.outputDir.mkdirs()

        // Create package directory structure
        val packageDir = config.packageName.replace('.', File.separatorChar)
        val outputPackageDir = File(config.outputDir, packageDir)
        outputPackageDir.mkdirs()

        // Write the generated file
        val outputFile = File(outputPackageDir, "${generatedClass.className}.kt")
        outputFile.writeText(generatedClass.code)

        return GeneratorResult(
            className = generatedClass.className,
            filePath = outputFile,
            code = generatedClass.code
        )
    }

    /**
     * Generate Kotlin builder code without writing to disk.
     */
    fun generateCode(document: XlrDocument): String {
        val generatedClass = ClassGenerator.generate(document, config.packageName)
        return generatedClass.code
    }

    companion object {
        /**
         * Generate Kotlin builder code from XLR JSON without creating a Generator instance.
         * Useful for one-off generation or testing.
         */
        fun generateCode(jsonContent: String, packageName: String): String {
            val document = XlrDeserializer.deserialize(jsonContent)
            return ClassGenerator.generate(document, packageName).code
        }

        /**
         * Generate Kotlin builder code from an XLR document without creating a Generator instance.
         */
        fun generateCode(document: XlrDocument, packageName: String): String =
            ClassGenerator
                .generate(document, packageName)
                .code
    }
}
