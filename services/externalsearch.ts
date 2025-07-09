interface StreamingResult {
  title: string
  url: string
  source: string
}

async function searchWeb(query: string): Promise<StreamingResult[]> {
  // Simula uma busca na web
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  await delay(1000) // Simula o tempo de busca

  // Resultados simulados
  const results: StreamingResult[] = [
    {
      title: query,
      url: `https://exemplo-streaming.com/assistir/${query.replace(/\s+/g, "-")}`,
      source: "ExemploStreaming",
    },
    { title: query, url: `https://filmes-online.com/titulo/${query.replace(/\s+/g, "-")}`, source: "FilmesOnline" },
    { title: query, url: `https://series-hd.net/play/${query.replace(/\s+/g, "-")}`, source: "SeriesHD" },
  ]

  return results
}

export async function searchExternalServices(title: string): Promise<StreamingResult[]> {
  try {
    console.log(`Buscando por "${title}" na web...`)
    const results = await searchWeb(title)
    console.log(`Resultados encontrados para "${title}":`, results)
    return results
  } catch (error) {
    console.error("Erro ao buscar conteúdo externo:", error)
    return []
  }
}

