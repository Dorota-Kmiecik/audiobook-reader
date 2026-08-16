package com.example.audiobookreader.data.room

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "chapters",
    foreignKeys = [ForeignKey(
        entity = BookEntity::class,
        parentColumns = ["id"],
        childColumns = ["bookId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("bookId"), Index(value = ["bookId", "chapterIndex"], unique = true)]
)
data class ChapterEntity(
    @PrimaryKey val id: String,
    val bookId: String,
    val chapterIndex: Int,
    val title: String,
    val resource: String,
    val locatorJson: String,
    val textLength: Int
)

@Entity(
    tableName = "text_segments",
    foreignKeys = [ForeignKey(
        entity = ChapterEntity::class,
        parentColumns = ["id"],
        childColumns = ["chapterId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("bookId"), Index("chapterId"), Index(value = ["bookId", "orderIndex"], unique = true)]
)
data class TextSegmentEntity(
    @PrimaryKey val id: String,
    val bookId: String,
    val chapterId: String,
    val orderIndex: Int,
    val text: String,
    val cleanText: String,
    val locatorJson: String,
    val startOffset: Int,
    val endOffset: Int,
    val pageNumber: Int?,
    val language: String
)

@Entity(
    tableName = "audio_segments",
    foreignKeys = [ForeignKey(
        entity = TextSegmentEntity::class,
        parentColumns = ["id"],
        childColumns = ["textSegmentId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("textSegmentId"), Index(value = ["textSegmentId", "voiceId"], unique = true)]
)
data class AudioSegmentEntity(
    @PrimaryKey val id: String,
    val textSegmentId: String,
    val voiceId: String,
    val audioPath: String?,
    val durationMs: Long?,
    val generationState: String,
    val sampleRate: Int?,
    val error: String?,
    val retryCount: Int = 0
)

@Entity(
    tableName = "audio_timings",
    primaryKeys = ["audioSegmentId", "textStart"],
    foreignKeys = [ForeignKey(
        entity = AudioSegmentEntity::class,
        parentColumns = ["id"],
        childColumns = ["audioSegmentId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("audioSegmentId")]
)
data class AudioTimingEntity(
    val audioSegmentId: String,
    val textStart: Int,
    val textEnd: Int,
    val frame: Int,
    val startMs: Long
)

@Entity(
    tableName = "playback_positions",
    foreignKeys = [ForeignKey(
        entity = BookEntity::class,
        parentColumns = ["id"],
        childColumns = ["bookId"],
        onDelete = ForeignKey.CASCADE
    )],
    indices = [Index("chapterId"), Index("textSegmentId"), Index("audioSegmentId")]
)
data class PlaybackPositionEntity(
    @PrimaryKey val bookId: String,
    val locatorJson: String,
    val chapterId: String?,
    val textSegmentId: String?,
    val audioSegmentId: String?,
    val positionMs: Long,
    val textOffset: Int,
    val overallProgress: Float,
    val updatedAt: Long
)
