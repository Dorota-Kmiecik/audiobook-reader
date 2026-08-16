package com.example.audiobookreader.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import android.net.Uri
import com.example.audiobookreader.domain.BookImportUseCase
import com.example.audiobookreader.domain.model.Book
import com.example.audiobookreader.domain.repository.BookRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class LibraryViewModel(
    private val repository: BookRepository,
    private val importer: BookImportUseCase
) : ViewModel() {
    private val _books = MutableStateFlow<List<Book>>(emptyList())
    val books: StateFlow<List<Book>> = _books
    private val _isImporting = MutableStateFlow(false)
    val isImporting: StateFlow<Boolean> = _isImporting
    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message

    init {
        viewModelScope.launch {
            repository.observeBooks().collect { items ->
                _books.value = items
            }
        }
    }

    fun importBook(uri: Uri) {
        if (_isImporting.value) return
        viewModelScope.launch {
            _isImporting.value = true
            _message.value = null
            runCatching { importer.import(uri) }
                .onFailure { _message.value = it.message ?: "Nie udało się zaimportować książki." }
            _isImporting.value = false
        }
    }

    fun dismissMessage() { _message.value = null }

    companion object {
        fun factory(repository: BookRepository, importer: BookImportUseCase) =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T =
                    LibraryViewModel(repository, importer) as T
            }
    }
}
