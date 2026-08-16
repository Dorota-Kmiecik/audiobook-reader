package com.example.audiobookreader

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.audiobookreader.ui.library.LibraryScreen
import com.example.audiobookreader.ui.library.LibraryViewModel
import com.example.audiobookreader.ui.theme.AudiobookReaderTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AudiobookReaderTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val app = application as AudiobookApplication
                    val libraryViewModel: LibraryViewModel = viewModel(
                        factory = LibraryViewModel.factory(app.bookRepository, app.bookImporter)
                    )
                    LibraryScreen(libraryViewModel)
                }
            }
        }
    }
}
