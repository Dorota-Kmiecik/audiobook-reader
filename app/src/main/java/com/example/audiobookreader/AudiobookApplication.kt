package com.example.audiobookreader

import android.app.Application
import androidx.room.Room
import com.example.audiobookreader.data.repository.RoomBookRepository
import com.example.audiobookreader.data.room.AudiobookDatabase
import com.example.audiobookreader.data.storage.AppStorageManager
import com.example.audiobookreader.domain.BookImportUseCase

class AudiobookApplication : Application() {
    val database: AudiobookDatabase by lazy {
        Room.databaseBuilder(this, AudiobookDatabase::class.java, "audiobook-reader.db")
            .addMigrations(AudiobookDatabase.MIGRATION_1_2)
            .build()
    }
    val bookRepository by lazy { RoomBookRepository(database) }
    val bookImporter by lazy { BookImportUseCase(this, AppStorageManager(this), bookRepository) }
}
