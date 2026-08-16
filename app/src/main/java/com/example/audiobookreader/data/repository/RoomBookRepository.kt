package com.example.audiobookreader.data.repository

import com.example.audiobookreader.data.room.AudiobookDatabase
import com.example.audiobookreader.data.room.BookEntity
import com.example.audiobookreader.domain.model.Book
import com.example.audiobookreader.domain.model.BookFormat
import com.example.audiobookreader.domain.model.ProcessingStatus
import com.example.audiobookreader.domain.repository.BookRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class RoomBookRepository(
    private val database: AudiobookDatabase
) : BookRepository {
    override fun observeBooks(): Flow<List<Book>> =
        database.bookDao().observeAll().map { books -> books.map { it.toDomain() } }

    override suspend fun saveBook(book: Book) {
        database.bookDao().insert(book.toEntity())
    }

    override suspend fun updateBook(book: Book) {
        database.bookDao().update(book.toEntity())
    }

    override suspend fun deleteBook(id: String) {
        database.bookDao().deleteById(id)
    }

    override suspend fun getBook(id: String): Book? {
        return database.bookDao().getById(id)?.toDomain()
    }

    override suspend fun findByHash(hash: String): Book? =
        database.bookDao().getByHash(hash)?.toDomain()

    private fun Book.toEntity(): BookEntity = BookEntity(
        id = id,
        fileHash = fileHash,
        localPath = localPath,
        format = format.name,
        title = title,
        author = author,
        language = language,
        coverPath = coverPath,
        importedAt = importedAtEpochMillis,
        lastOpenedAt = lastOpenedAtEpochMillis,
        totalProgress = totalProgress,
        selectedVoiceId = selectedVoiceId,
        processingStatus = processingStatus.name
    )

    private fun BookEntity.toDomain(): Book = Book(
        id = id,
        title = title,
        author = author,
        language = language,
        format = BookFormat.valueOf(format),
        localPath = localPath,
        coverPath = coverPath,
        fileHash = fileHash,
        selectedVoiceId = selectedVoiceId,
        totalProgress = totalProgress,
        importedAtEpochMillis = importedAt,
        lastOpenedAtEpochMillis = lastOpenedAt,
        processingStatus = ProcessingStatus.valueOf(processingStatus)
    )
}
