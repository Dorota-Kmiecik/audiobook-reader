package com.example.audiobookreader.data.storage

import android.content.Context
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.security.MessageDigest

class AppStorageManager(private val context: Context) {
    private val booksDir: File = File(context.filesDir, "books")

    init {
        booksDir.mkdirs()
    }

    fun ensureBookDirectory(bookId: String): File {
        val bookDir = File(booksDir, bookId)
        if (!bookDir.exists()) {
            bookDir.mkdirs()
        }
        return bookDir
    }

    fun copyToPrivateStorage(uri: Uri, destination: File): String {
        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Nie można otworzyć pliku do importu.")

        destination.parentFile?.mkdirs()
        FileOutputStream(destination).use { output ->
            inputStream.copyTo(output)
        }
        inputStream.close()

        return sha256(destination)
    }

    fun bookRootDirectory(): File = booksDir

    private fun sha256(file: File): String {
        val bytes = file.readBytes()
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(bytes)
        return hash.joinToString("") { "%02x".format(it) }
    }

    fun copyStream(input: InputStream, target: File) {
        target.parentFile?.mkdirs()
        FileOutputStream(target).use { output ->
            input.copyTo(output)
        }
    }
}
