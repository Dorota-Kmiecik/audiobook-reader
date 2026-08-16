package com.example.audiobookreader.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF5C7CFA),
    secondary = androidx.compose.ui.graphics.Color(0xFF748FFC),
    tertiary = androidx.compose.ui.graphics.Color(0xFFB197FC)
)

private val DarkColors = darkColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF8FA8FF),
    secondary = androidx.compose.ui.graphics.Color(0xFFB8C5FF),
    tertiary = androidx.compose.ui.graphics.Color(0xFFD7C8FF)
)

@Composable
fun AudiobookReaderTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colors,
        content = content
    )
}
