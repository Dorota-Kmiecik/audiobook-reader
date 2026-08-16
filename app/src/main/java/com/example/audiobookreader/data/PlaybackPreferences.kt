package com.example.audiobookreader.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.playbackStore: DataStore<Preferences> by preferencesDataStore(name = "playback_prefs")

class PlaybackPreferences(private val context: Context) {
    private val playbackSpeedKey = floatPreferencesKey("playback_speed")
    private val preferredVoiceKey = stringPreferencesKey("preferred_voice_id")

    val playbackSpeedFlow: Flow<Float> = context.playbackStore.data.map { prefs ->
        prefs[playbackSpeedKey] ?: 1.0f
    }

    val preferredVoiceIdFlow: Flow<String?> = context.playbackStore.data.map { prefs ->
        prefs[preferredVoiceKey]
    }

    suspend fun setPlaybackSpeed(speed: Float) {
        context.playbackStore.edit { prefs ->
            prefs[playbackSpeedKey] = speed
        }
    }

    suspend fun setPreferredVoiceId(voiceId: String) {
        context.playbackStore.edit { prefs ->
            prefs[preferredVoiceKey] = voiceId
        }
    }
}
