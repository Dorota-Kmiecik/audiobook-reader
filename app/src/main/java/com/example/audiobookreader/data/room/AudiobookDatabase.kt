package com.example.audiobookreader.data.room

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Update
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow

@Database(
    entities = [
        BookEntity::class,
        ChapterEntity::class,
        TextSegmentEntity::class,
        AudioSegmentEntity::class,
        AudioTimingEntity::class,
        PlaybackPositionEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AudiobookDatabase : RoomDatabase() {
    abstract fun bookDao(): BookDao
    abstract fun contentDao(): ContentDao
    abstract fun playbackPositionDao(): PlaybackPositionDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("CREATE TABLE IF NOT EXISTS `chapters` (`id` TEXT NOT NULL, `bookId` TEXT NOT NULL, `chapterIndex` INTEGER NOT NULL, `title` TEXT NOT NULL, `resource` TEXT NOT NULL, `locatorJson` TEXT NOT NULL, `textLength` INTEGER NOT NULL, PRIMARY KEY(`id`), FOREIGN KEY(`bookId`) REFERENCES `books`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_chapters_bookId` ON `chapters` (`bookId`)")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_chapters_bookId_chapterIndex` ON `chapters` (`bookId`, `chapterIndex`)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `text_segments` (`id` TEXT NOT NULL, `bookId` TEXT NOT NULL, `chapterId` TEXT NOT NULL, `orderIndex` INTEGER NOT NULL, `text` TEXT NOT NULL, `cleanText` TEXT NOT NULL, `locatorJson` TEXT NOT NULL, `startOffset` INTEGER NOT NULL, `endOffset` INTEGER NOT NULL, `pageNumber` INTEGER, `language` TEXT NOT NULL, PRIMARY KEY(`id`), FOREIGN KEY(`chapterId`) REFERENCES `chapters`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_text_segments_bookId` ON `text_segments` (`bookId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_text_segments_chapterId` ON `text_segments` (`chapterId`)")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_text_segments_bookId_orderIndex` ON `text_segments` (`bookId`, `orderIndex`)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `audio_segments` (`id` TEXT NOT NULL, `textSegmentId` TEXT NOT NULL, `voiceId` TEXT NOT NULL, `audioPath` TEXT, `durationMs` INTEGER, `generationState` TEXT NOT NULL, `sampleRate` INTEGER, `error` TEXT, `retryCount` INTEGER NOT NULL, PRIMARY KEY(`id`), FOREIGN KEY(`textSegmentId`) REFERENCES `text_segments`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_audio_segments_textSegmentId` ON `audio_segments` (`textSegmentId`)")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_audio_segments_textSegmentId_voiceId` ON `audio_segments` (`textSegmentId`, `voiceId`)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `audio_timings` (`audioSegmentId` TEXT NOT NULL, `textStart` INTEGER NOT NULL, `textEnd` INTEGER NOT NULL, `frame` INTEGER NOT NULL, `startMs` INTEGER NOT NULL, PRIMARY KEY(`audioSegmentId`, `textStart`), FOREIGN KEY(`audioSegmentId`) REFERENCES `audio_segments`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_audio_timings_audioSegmentId` ON `audio_timings` (`audioSegmentId`)")
                db.execSQL("CREATE TABLE IF NOT EXISTS `playback_positions` (`bookId` TEXT NOT NULL, `locatorJson` TEXT NOT NULL, `chapterId` TEXT, `textSegmentId` TEXT, `audioSegmentId` TEXT, `positionMs` INTEGER NOT NULL, `textOffset` INTEGER NOT NULL, `overallProgress` REAL NOT NULL, `updatedAt` INTEGER NOT NULL, PRIMARY KEY(`bookId`), FOREIGN KEY(`bookId`) REFERENCES `books`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_playback_positions_chapterId` ON `playback_positions` (`chapterId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_playback_positions_textSegmentId` ON `playback_positions` (`textSegmentId`)")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_playback_positions_audioSegmentId` ON `playback_positions` (`audioSegmentId`)")
            }
        }
    }
}

@Dao
interface ContentDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChapters(chapters: List<ChapterEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTextSegments(segments: List<TextSegmentEntity>)

    @Query("SELECT * FROM chapters WHERE bookId = :bookId ORDER BY chapterIndex")
    fun observeChapters(bookId: String): Flow<List<ChapterEntity>>

    @Query("SELECT * FROM text_segments WHERE bookId = :bookId ORDER BY orderIndex")
    fun observeTextSegments(bookId: String): Flow<List<TextSegmentEntity>>

    @Query("DELETE FROM chapters WHERE bookId = :bookId")
    suspend fun clearBookContent(bookId: String)
}

@Dao
interface PlaybackPositionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(position: PlaybackPositionEntity)

    @Query("SELECT * FROM playback_positions WHERE bookId = :bookId")
    fun observe(bookId: String): Flow<PlaybackPositionEntity?>
}

@Dao
interface BookDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(book: BookEntity)

    @Update
    suspend fun update(book: BookEntity)

    @Query("SELECT * FROM books ORDER BY lastOpenedAt DESC")
    fun observeAll(): Flow<List<BookEntity>>

    @Query("SELECT * FROM books WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): BookEntity?

    @Query("SELECT * FROM books WHERE fileHash = :hash LIMIT 1")
    suspend fun getByHash(hash: String): BookEntity?

    @Query("DELETE FROM books WHERE id = :id")
    suspend fun deleteById(id: String)
}
