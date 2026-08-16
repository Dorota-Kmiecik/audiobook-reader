package com.example.audiobookreader.data.room

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "books")
data class BookEntity(
    @PrimaryKey val id: String,
    val fileHash: String,
    val localPath: String,
    val format: String,
    val title: String,
    val author: String,
    val language: String,
    val coverPath: String?,
    val importedAt: Long,
    val lastOpenedAt: Long,
    val totalProgress: Float,
    val selectedVoiceId: String?,
    val processingStatus: String
)
