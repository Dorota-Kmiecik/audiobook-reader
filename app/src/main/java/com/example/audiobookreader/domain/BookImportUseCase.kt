package com.example.audiobookreader.domain

import android.content.Context
import android.net.Uri
import com.example.audiobookreader.data.storage.AppStorageManager
import com.example.audiobookreader.domain.model.Book
import com.example.audiobookreader.domain.model.BookFormat
import com.example.audiobookreader.domain.model.ProcessingStatus
import com.example.audiobookreader.domain.repository.BookRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.UUID

class BookImportUseCase(
    private val context: Context,
    private val storageManager: AppStorageManager,
    private val repository: BookRepository,
    private val validator: BookImportValidator = BookImportValidator()
) {
    suspend fun import(uri: Uri): Book = withContext(Dispatchers.IO) {
        val validation = validator.validate(uri, context.contentResolver)
        val bookId = UUID.randomUUID().toString()
        val bookDir = storageManager.ensureBookDirectory(bookId)
        val targetFile = File(bookDir, "source.${validation.extension.ifEmpty { "bin" }}")
        val hash = storageManager.copyToPrivateStorage(uri, targetFile)

        repository.findByHash(hash)?.let {
            bookDir.deleteRecursively()
            throw DuplicateBookException(it.title)
        }

        val book = Book(
            id = bookId,
            title = targetFile.nameWithoutExtension,
            author = "Nieznany autor",
            language = "und",
            format = validation.format,
            localPath = targetFile.absolutePath,
            fileHash = hash,
            processingStatus = ProcessingStatus.ANALYSING
        )

        repository.saveBook(book)
        book
    }

    fun canImportFrom(uri: Uri): Boolean {
        return try {
            val validation = validator.validate(uri, context.contentResolver)
            validation.format == BookFormat.EPUB || validation.format == BookFormat.PDF
        } catch (_: IllegalArgumentException) {
            false
        }
    }
}


class DuplicateBookException(title: String) :
    IllegalArgumentException("Ta książka jest już w bibliotece: $title")
