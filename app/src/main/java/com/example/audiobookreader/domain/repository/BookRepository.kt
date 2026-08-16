package com.example.audiobookreader.domain.repository

import com.example.audiobookreader.domain.model.Book
import kotlinx.coroutines.flow.Flow

interface BookRepository {
    fun observeBooks(): Flow<List<Book>>
    suspend fun saveBook(book: Book)
    suspend fun updateBook(book: Book)
    suspend fun deleteBook(id: String)
    suspend fun getBook(id: String): Book?
    suspend fun findByHash(hash: String): Book?
}
