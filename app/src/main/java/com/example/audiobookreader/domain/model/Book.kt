package com.example.audiobookreader.domain.model

import java.util.UUID

data class Book(
    val id: String = UUID.randomUUID().toString(),
    val title: String = "",
    val author: String = "",
    val language: String = "pl",
    val format: BookFormat = BookFormat.EPUB,
    val localPath: String = "",
    val coverPath: String? = null,
    val fileHash: String = "",
    val selectedVoiceId: String? = null,
    val totalProgress: Float = 0f,
    val importedAtEpochMillis: Long = System.currentTimeMillis(),
    val lastOpenedAtEpochMillis: Long = importedAtEpochMillis,
    val processingStatus: ProcessingStatus = ProcessingStatus.CREATED
)

enum class BookFormat { EPUB, PDF }

enum class ProcessingStatus { CREATED, ANALYSING, READY, ERROR }
