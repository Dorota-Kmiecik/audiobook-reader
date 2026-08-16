package com.example.audiobookreader.data.epub

import android.content.Context
import com.example.audiobookreader.domain.BookContentProvider
import com.example.audiobookreader.domain.BookChapter
import com.example.audiobookreader.domain.TextSegment
import com.example.audiobookreader.domain.model.Book
import org.readium.r2.shared.publication.Publication

class ReadiumEpubProvider(
    private val context: Context
) : BookContentProvider {
    private var publication: Publication? = null

    override suspend fun open(book: Book) {
        publication = null
    }

    override suspend fun extractMetadata(book: Book): Book {
        return book
    }

    override suspend fun chapters(book: Book): List<BookChapter> {
        return emptyList()
    }

    override suspend fun textSegments(book: Book): List<TextSegment> {
        return emptyList()
    }

    override suspend fun cleanupText(rawText: String): String {
        return rawText
            .replace(Regex("\\s+"), " ")
            .trim()
    }
}
