'use client'

import { useState } from 'react'
import { Search, X, MessageSquare, Code, Lightbulb } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useMessageSearch } from '@/hooks/use-message-search'
import { Message } from '@/types'
import { cn } from '@/lib/utils'

interface MessageSearchProps {
  messages: Message[]
  onMessageSelect?: (messageId: string) => void
}

export function MessageSearch({ messages, onMessageSelect }: MessageSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    searchQuery,
    searchResults,
    isSearching,
    performSearch,
    clearSearch,
    highlightText,
    hasResults,
    resultCount
  } = useMessageSearch(messages)

  const handleSearch = (query: string) => {
    performSearch(query)
  }

  const handleMessageClick = (messageId: string) => {
    onMessageSelect?.(messageId)
    setIsOpen(false)
  }

  const getMessageTypeIcon = (tipo: Message['tipo']) => {
    switch (tipo) {
      case 'user':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'assistant':
        return <Lightbulb className="h-4 w-4 text-green-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />
    }
  }

  const getMessageTypeLabel = (tipo: Message['tipo']) => {
    switch (tipo) {
      case 'user':
        return 'Você'
      case 'assistant':
        return 'QueryLab'
      case 'error':
        return 'Erro'
      default:
        return 'Sistema'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Buscar mensagens
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar em {messages.length} mensagens
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite para buscar em mensagens, SQL ou explicações..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Resultados */}
          <div className="space-y-2">
            {isSearching && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                Buscando...
              </div>
            )}

            {!isSearching && searchQuery && !hasResults && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhum resultado encontrado para "{searchQuery}"</p>
                <p className="text-sm mt-1">Tente termos diferentes ou mais específicos</p>
              </div>
            )}

            {!isSearching && hasResults && (
              <>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="gap-1">
                    <Search className="h-3 w-3" />
                    {resultCount} resultado{resultCount !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.message.id}-${index}`}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          "hover:bg-muted/50 hover:border-primary/20"
                        )}
                        onClick={() => handleMessageClick(result.message.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getMessageTypeIcon(result.message.tipo)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {getMessageTypeLabel(result.message.tipo)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {result.message.timestamp.toLocaleString('pt-BR')}
                              </span>
                            </div>
                            
                            <div 
                              className="text-sm text-muted-foreground line-clamp-2"
                              dangerouslySetInnerHTML={{
                                __html: highlightText(result.context, searchQuery)
                              }}
                            />
                            
                            {result.message.sqlQuery && result.context.includes('SQL:') && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                                <Code className="h-3 w-3 inline mr-1" />
                                SQL encontrado
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {!searchQuery && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2" />
                <p>Digite algo para buscar nas mensagens</p>
                <p className="text-sm mt-1">Busque por conteúdo, SQL ou explicações</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
