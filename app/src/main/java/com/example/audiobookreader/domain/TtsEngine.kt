package com.example.audiobookreader.domain

import android.content.Context

interface TtsEngine {
    fun availableVoices(): List<TtsVoice>
    fun speak(text: String, voiceId: String?, language: String, onProgress: (TtsProgress) -> Unit)
    fun shutdown()
    fun openVoiceSettings(context: Context)
}

data class TtsVoice(
    val id: String,
    val name: String,
    val language: String,
    val isDefault: Boolean = false
)

data class TtsProgress(
    val currentText: String = "",
    val isSpeaking: Boolean = false,
    val utteranceId: String = ""
)
