package com.example.audiobookreader.domain

import com.example.audiobookreader.domain.model.Book

interface BookContentProvider {
    suspend fun open(book: Book)
    suspend fun extractMetadata(book: Book): Book
    suspend fun chapters(book: Book): List<BookChapter>
    suspend fun textSegments(book: Book): List<TextSegment>
    suspend fun cleanupText(rawText: String): String
}

data class BookChapter(
    val id: String,
    val title: String,
    val resource: String,
    val index: Int,
    val locator: String = ""
)

data class TextSegment(
    val id: String,
    val chapterId: String,
    val text: String,
    val cleanText: String,
    val locator: String,
    val orderIndex: Int,
    val language: String = "pl"
)
