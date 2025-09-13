import { useState, useMemo } from 'react'
import { Message } from '@/types'

export interface SearchResult {
  message: Message
  matchedText: string
  context: string
}

export function useMessageSearch(messages: Message[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()
    const results: SearchResult[] = []

    messages.forEach((message) => {
      const content = message.conteudo.toLowerCase()
      const sqlQuery = message.sqlQuery?.toLowerCase() || ''
      const explanation = message.explanation?.toLowerCase() || ''

      // Buscar no conteúdo principal
      if (content.includes(query)) {
        const index = content.indexOf(query)
        const start = Math.max(0, index - 50)
        const end = Math.min(content.length, index + query.length + 50)
        const context = message.conteudo.substring(start, end)
        
        results.push({
          message,
          matchedText: message.conteudo.substring(index, index + query.length),
          context: start > 0 ? '...' + context : context
        })
      }

      // Buscar no SQL
      if (sqlQuery.includes(query)) {
        const index = sqlQuery.indexOf(query)
        const start = Math.max(0, index - 30)
        const end = Math.min(sqlQuery.length, index + query.length + 30)
        const context = (message.sqlQuery || '').substring(start, end)
        
        results.push({
          message,
          matchedText: (message.sqlQuery || '').substring(index, index + query.length),
          context: `SQL: ${start > 0 ? '...' + context : context}`
        })
      }

      // Buscar na explicação
      if (explanation.includes(query)) {
        const index = explanation.indexOf(query)
        const start = Math.max(0, index - 50)
        const end = Math.min(explanation.length, index + query.length + 50)
        const context = (message.explanation || '').substring(start, end)
        
        results.push({
          message,
          matchedText: (message.explanation || '').substring(index, index + query.length),
          context: `Explicação: ${start > 0 ? '...' + context : context}`
        })
      }
    })

    return results
  }, [messages, searchQuery])

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>')
  }

  const performSearch = (query: string) => {
    setIsSearching(true)
    setSearchQuery(query)
    
    // Simular delay de busca para UX
    setTimeout(() => {
      setIsSearching(false)
    }, 300)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
  }

  return {
    searchQuery,
    searchResults,
    isSearching,
    performSearch,
    clearSearch,
    highlightText,
    hasResults: searchResults.length > 0,
    resultCount: searchResults.length
  }
}
