package com.example.audiobookreader.domain

import android.content.ContentResolver
import android.net.Uri
import android.webkit.MimeTypeMap
import com.example.audiobookreader.domain.model.BookFormat
import java.io.File

data class BookImportValidation(
    val format: BookFormat,
    val mimeType: String,
    val extension: String,
    val fileName: String
)

class BookImportValidator {
    fun validate(uri: Uri, contentResolver: ContentResolver): BookImportValidation {
        val fileName = uri.lastPathSegment?.substringAfterLast('/') ?: "book"
        val extension = fileName.substringAfterLast('.', "").lowercase()
        val mimeType = contentResolver.getType(uri)?.lowercase() ?: guessMimeType(extension)

        val format = when {
            extension == "epub" || mimeType.contains("epub") -> BookFormat.EPUB
            extension == "pdf" || mimeType.contains("pdf") -> BookFormat.PDF
            else -> throw IllegalArgumentException("Nieobsługiwany format pliku. Wspierane: EPUB i PDF.")
        }

        return BookImportValidation(
            format = format,
            mimeType = mimeType,
            extension = extension,
            fileName = fileName
        )
    }

    fun validateLocalFile(file: File): BookImportValidation {
        val extension = file.name.substringAfterLast('.', "").lowercase()
        val mimeType = guessMimeType(extension)
        val format = when {
            extension == "epub" || mimeType.contains("epub") -> BookFormat.EPUB
            extension == "pdf" || mimeType.contains("pdf") -> BookFormat.PDF
            else -> throw IllegalArgumentException("Nieobsługiwany format pliku. Wspierane: EPUB i PDF.")
        }
        return BookImportValidation(format, mimeType, extension, file.name)
    }

    private fun guessMimeType(extension: String): String {
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
            ?: when (extension.lowercase()) {
                "epub" -> "application/epub+zip"
                "pdf" -> "application/pdf"
                else -> "application/octet-stream"
            }
    }
}
