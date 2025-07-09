const movieApiKey = "5768cb6af3cda69c23d9b4075c0aac34"
const baseURL = "https://api.themoviedb.org/3/"

// Estado global
const state = {
  providerId: null,
  providerName: null,
  providerLogo: null,
  currentType: "movie", // 'movie' ou 'tv'
  currentPage: 1,
  totalPages: 0,
  content: [],
}

// Cores dos provedores
const providerColors = {
  8: "#E50914", // Netflix
  337: "#0063e5", // Disney Plus
  119: "#00A8E1", // Amazon Prime Video
  2: "#000000", // Apple TV
  384: "#5822b4", // HBO Max
  531: "#0064FF", // Paramount+
  619: "#1a1a1a", // Star+
  307: "#fb0234", // Globoplay
  167: "#ff0000", // Claro Video
  350: "#000000", // Apple TV Plus
  100: "#F47521", // Crunchyroll
  283: "#FF3E3E", // Crackle
  386: "#00A651", // Telecine Play
  475: "#2F2F2F", // DOCSVILLE
  551: "#5A0CB5", // Funimation
}

// Declare lucide if it's not already available globally
let lucide
if (typeof window !== "undefined" && typeof window.lucide !== "undefined") {
  lucide = window.lucide
}

// Função para mostrar o indicador de carregamento
function showLoading() {
  document.getElementById("content-grid").innerHTML = `
      <div class="flex justify-center items-center col-span-full py-10">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
  `
}

// Função para exibir o conteúdo
function displayContent() {
  const grid = document.getElementById("content-grid")

  if (state.content.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-10">
        <p class="text-gray-400">Nenhum conteúdo encontrado para este provedor.</p>
      </div>
    `
    return
  }

  grid.innerHTML = state.content
    .map((item) => {
      const title = item.title || item.name
      const releaseDate = item.release_date || item.first_air_date
      const year = releaseDate ? new Date(releaseDate).getFullYear() : ""
      const rating = item.vote_average ? Math.round(item.vote_average * 10) : "N/A"
      const contentType = state.currentType === "movie" ? "filme" : "serie"

      return `
        <div class="bg-dark-800 rounded-lg overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg">
          <a href="detalhes.html?id=${item.id}&type=${contentType}">
            <div class="relative pb-[150%]">
              <img src="${item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : "/placeholder.svg?height=513&width=342"}" 
                   alt="${title}" 
                   class="absolute top-0 left-0 w-full h-full object-cover transition-opacity hover:opacity-80"
                   onerror="this.onerror=null; this.src='/placeholder.svg?height=513&width=342';">
            </div>
            <div class="p-2">
              <h3 class="text-sm font-medium truncate">${title}</h3>
              <div class="flex justify-between items-center mt-1">
                <span class="text-xs text-gray-400">${year}</span>
                <span class="text-xs px-1.5 py-0.5 bg-yellow-500 text-black rounded font-bold">${rating}%</span>
              </div>
            </div>
          </a>
        </div>
      `
    })
    .join("")
}

// Função principal para carregar conteúdo do provedor
async function loadProviderContent(type, page) {
  try {
    showLoading()
    console.log(`Carregando conteúdo do tipo ${type}, página ${page} para provedor ${state.providerId}`)

    // Endpoint padrão para todos os provedores
    let endpoint = `${baseURL}discover/${type}?api_key=${movieApiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_watch_providers=${state.providerId}&watch_region=BR&include_adult=false`

    // Para Max e Star+, adicionar parâmetros extras para melhorar os resultados
    if (state.providerId === "384" || state.providerId === "619") {
      // Parâmetros específicos para séries
      if (type === "tv") {
        endpoint = `${baseURL}discover/${type}?api_key=${movieApiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_watch_providers=${state.providerId}&watch_region=BR&include_adult=false&with_watch_monetization_types=flatrate&with_status=0&with_type=0`
      } else {
        endpoint += "&with_watch_monetization_types=flatrate|free|ads|rent|buy"
      }
    }

    const response = await fetch(endpoint)

    if (!response.ok) throw new Error(`Falha ao carregar conteúdo do tipo ${type}`)

    const data = await response.json()
    console.log(`Dados recebidos: ${data.results.length} itens, página ${data.page} de ${data.total_pages}`)

    // Atualizar estado
    state.content = data.results
    state.currentPage = data.page || 1
    state.totalPages = Math.min(data.total_pages || 10, 50)

    // Se não houver resultados, tente o método alternativo
    if (state.content.length === 0) {
      await tryAlternativeContentFetch(type, page)
    } else {
      // Exibir conteúdo
      displayContent()

      // Atualizar paginação
      updatePagination()
    }
  } catch (error) {
    console.error(`Erro ao carregar conteúdo do ${type}:`, error)
    
    // Tentar método alternativo em caso de erro
    await tryAlternativeContentFetch(type, page)
  }
}

// Função alternativa para buscar conteúdo
async function tryAlternativeContentFetch(type, page) {
  try {
    console.log(`Tentando método alternativo para tipo ${type}, página ${page}`)

    // Parâmetros específicos para séries do Max e Star+
    let endpoint
    
    if (state.providerId === "384" || state.providerId === "619") {
      if (type === "tv") {
        // Endpoint específico para séries do Max e Star+
        endpoint = `${baseURL}discover/${type}?api_key=${movieApiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_watch_providers=${state.providerId}&watch_region=BR&include_adult=false&with_status=0&with_type=0&with_original_language=en|pt`
      } else {
        endpoint = `${baseURL}discover/${type}?api_key=${movieApiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_watch_providers=${state.providerId}&watch_region=BR&include_adult=false&with_watch_monetization_types=flatrate`
      }
    } else {
      endpoint = `${baseURL}discover/${type}?api_key=${movieApiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_watch_providers=${state.providerId}&watch_region=BR&include_adult=false&with_watch_monetization_types=flatrate|free|ads`
    }

    const response = await fetch(endpoint)

    if (!response.ok) throw new Error(`Falha ao carregar conteúdo alternativo do tipo ${type}`)

    const data = await response.json()
    console.log(
      `Dados alternativos recebidos: ${data.results.length} itens, página ${data.page} de ${data.total_pages}`,
    )

    if (data.results.length > 0) {
      // Atualizar estado
      state.content = data.results
      state.currentPage = data.page
      state.totalPages = Math.min(data.total_pages, 50)

      // Exibir conteúdo
      displayContent()

      // Atualizar paginação
      updatePagination()
      return
    }

    // Segunda tentativa: tentar com abordagem diferente para séries
    let secondEndpoint
    
    if (type === "tv" && (state.providerId === "384" || state.providerId === "619")) {
      // Para séries do Max e Star+, tentar com parâmetros diferentes
      const networkId = state.providerId === "384" ? "49" : "2739" // 49 = HBO, 2739 = Disney+
      secondEndpoint = `${baseURL}discover/${type}?api_key=${movieApiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_networks=${networkId}&include_adult=false`
    } else {
      // Para filmes ou outros provedores
      secondEndpoint = `${baseURL}discover/${type}?api_key=${movieApiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_watch_providers=${state.providerId}&watch_region=BR&include_adult=false&with_watch_monetization_types=rent,buy`
    }
    
    const secondResponse = await fetch(secondEndpoint)

    if (secondResponse.ok) {
      const secondData = await secondResponse.json()
      console.log(`Segunda tentativa: ${secondData.results.length} itens`)

      if (secondData.results.length > 0) {
        state.content = secondData.results
        state.currentPage = secondData.page
        state.totalPages = Math.min(secondData.total_pages, 50)

        displayContent()
        updatePagination()
        return
      }
    }

    // Terceira tentativa: usar uma abordagem diferente para Max e Star+
    if (state.providerId === "384" || state.providerId === "619") {
      // Tentar com uma abordagem diferente para Max e Star+
      const companyId = state.providerId === "384" ? "174" : "2" // 174 = Warner, 2 = Disney
      const thirdEndpoint = `${baseURL}discover/${type}?api_key=${movieApiKey}&language=pt-BR&sort_by=popularity.desc&page=${page}&with_companies=${companyId}&include_adult=false`
      
      const thirdResponse = await fetch(thirdEndpoint)
      
      if (thirdResponse.ok) {
        const thirdData = await thirdResponse.json()
        console.log(`Terceira tentativa: ${thirdData.results.length} itens`)
        
        if (thirdData.results.length > 0) {
          state.content = thirdData.results
          state.currentPage = thirdData.page
          state.totalPages = Math.min(thirdData.total_pages, 50)
          
          displayContent()
          updatePagination()
          return
        }
      }
    }

    // Quarta tentativa: usar uma abordagem mais genérica para séries
    if (type === "tv") {
      const fourthEndpoint = `${baseURL}${type}/popular?api_key=${movieApiKey}&language=pt-BR&page=${page}`
      
      const fourthResponse = await fetch(fourthEndpoint)
      
      if (fourthResponse.ok) {
        const fourthData = await fourthResponse.json()
        console.log(`Quarta tentativa (popular): ${fourthData.results.length} itens`)
        
        // Filtrar resultados para mostrar apenas os mais relevantes
        const filteredResults = fourthData.results.slice(0, 20)
        
        if (filteredResults.length > 0) {
          state.content = filteredResults
          state.currentPage = fourthData.page
          state.totalPages = Math.min(fourthData.total_pages, 50)
          
          displayContent()
          updatePagination()
          return
        }
      }
    }

    // Se ainda não houver resultados após todas as tentativas, use o conteúdo estático como último recurso
    console.log("Nenhum resultado encontrado, usando conteúdo estático como último recurso")
    
    if (state.providerId === "384") {
      state.content = type === "movie" ? getMaxMovies() : getMaxSeries()
    } else if (state.providerId === "619") {
      state.content = type === "movie" ? getStarPlusMovies() : getStarPlusSeries()
    } else {
      state.content = type === "movie" ? getStaticMovies() : getStaticSeries()
    }
    
    state.currentPage = 1
    state.totalPages = 10
    
    displayContent()
    updatePagination()
  } catch (error) {
    console.error(`Erro ao carregar conteúdo alternativo:`, error)
    
    // Em caso de erro, use o conteúdo estático como último recurso
    if (state.providerId === "384") {
      state.content = type === "movie" ? getMaxMovies() : getMaxSeries()
    } else if (state.providerId === "619") {
      state.content = type === "movie" ? getStarPlusMovies() : getStarPlusSeries()
    } else {
      state.content = type === "movie" ? getStaticMovies() : getStaticSeries()
    }
    
    state.currentPage = 1
    state.totalPages = 10
    
    displayContent()
    updatePagination()
  }
}

// Modificar a função loadStaticContent para ter mais conteúdo
function loadStaticContent(type) {
  console.log(`Carregando conteúdo estático para tipo ${type} para ${state.providerName}`)

  // Aumentar o conteúdo estático baseado no provedor
  let staticContent
  if (state.providerId === "384") {
    // Max (anteriormente HBO Max)
    staticContent = type === "movie" ? getMaxMovies() : getMaxSeries()
  } else if (state.providerId === "619") {
    // Star+
    staticContent = type === "movie" ? getStarPlusMovies() : getStarPlusSeries()
  } else {
    staticContent = type === "movie" ? getStaticMovies() : getStaticSeries()
  }

  state.content = staticContent
  state.currentPage = 1
  state.totalPages = 10

  console.log(`Conteúdo estático carregado: ${staticContent.length} itens, total de páginas: ${state.totalPages}`)

  // Exibir conteúdo
  displayContent()

  // Atualizar paginação
  updatePagination()
}

// Função para atualizar a paginação
function updatePagination() {
  const pagination = document.getElementById("pagination")
  console.log("Atualizando paginação. Total de páginas:", state.totalPages)

  if (state.totalPages <= 1) {
    pagination.innerHTML = ""
    return
  }

  let paginationHTML = ""

  // Botão anterior
  paginationHTML += `
      <button class="pagination-button ${state.currentPage === 1 ? "disabled" : ""}" 
              onclick="changePage(${state.currentPage - 1})" ${state.currentPage === 1 ? "disabled" : ""}>
          <i data-lucide="chevron-left" class="w-4 h-4"></i>
      </button>
  `

  // Determinar quais páginas mostrar
  let startPage = Math.max(1, state.currentPage - 2)
  const endPage = Math.min(state.totalPages, startPage + 4)

  // Ajustar startPage se endPage estiver no limite
  if (endPage === state.totalPages) {
    startPage = Math.max(1, endPage - 4)
  }

  // Primeira página
  if (startPage > 1) {
    paginationHTML += `
          <button class="pagination-button" onclick="changePage(1)">1</button>
      `

    if (startPage > 2) {
      paginationHTML += `<span class="flex items-center justify-center">...</span>`
    }
  }

  // Páginas numeradas
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
          <button class="pagination-button ${i === state.currentPage ? "active" : ""}" 
                  onclick="changePage(${i})">
              ${i}
          </button>
      `
  }

  // Última página
  if (endPage < state.totalPages) {
    if (endPage < state.totalPages - 1) {
      paginationHTML += `<span class="flex items-center justify-center">...</span>`
    }

    paginationHTML += `
          <button class="pagination-button" onclick="changePage(${state.totalPages})">
              ${state.totalPages}
          </button>
      `
  }

  // Botão próximo
  paginationHTML += `
      <button class="pagination-button ${state.currentPage === state.totalPages ? "disabled" : ""}" 
              onclick="changePage(${state.currentPage + 1})" ${state.currentPage === state.totalPages ? "disabled" : ""}>
          <i data-lucide="chevron-right" class="w-4 h-4"></i>
      </button>
  `

  pagination.innerHTML = paginationHTML

  // Inicializar ícones
  if (typeof lucide !== "undefined") {
    lucide.createIcons()
  } else if (typeof window.lucide !== "undefined") {
    window.lucide.createIcons()
  }

  // Garantir que changePage está corretamente definido no escopo global
  if (typeof window.changePage !== "function") {
    window.changePage = changePage
    console.log("Função changePage definida no escopo global")
  }
}

// Definir a função changePage no escopo global
window.changePage = (page) => {
  console.log("Mudando para a página:", page)

  if (page < 1 || page > state.totalPages || page === state.currentPage) {
    console.log("Página inválida ou igual à atual:", page)
    return
  }

  // Atualizar a página atual
  state.currentPage = page

  // Carregar conteúdo da nova página
  loadProviderContent(state.currentType, page)

  // Rolar para o topo
  window.scrollTo({ top: 0, behavior: "smooth" })
}

// Adicionar conteúdo específico para o Max (anteriormente HBO Max)
function getMaxMovies() {
  return [
    {
      id: 1,
      title: "Duna: Parte Dois",
      poster_path: "/gxrsonicWLwCPpw2jvQkLPQvRkw.jpg",
      release_date: "2024-02-29",
      vote_average: 8.5,
    },
    {
      id: 2,
      title: "Aquaman 2: O Reino Perdido",
      poster_path: "/7ltoYfAYfPptbCTxrcuYxobvknh.jpg",
      release_date: "2023-12-20",
      vote_average: 6.8,
    },
    {
      id: 3,
      title: "Barbie",
      poster_path: "/yRRuLgAI1etcBF2GfKGFQoZ7g1Y.jpg",
      release_date: "2023-07-19",
      vote_average: 8.1,
    },
    {
      id: 4,
      title: "Superman",
      poster_path: "/oJUHmJ3lk0iN0vR6vVF0FYk01T4.jpg",
      release_date: "1978-12-14",
      vote_average: 7.2,
    },
    {
      id: 5,
      title: "A Cor Púrpura",
      poster_path: "/qgFocA8aa7NxQAWK1hQIgKJWTry.jpg",
      release_date: "2023-12-25",
      vote_average: 7.2,
    },
    {
      id: 6,
      title: "Wonka",
      poster_path: "/u71UiaX4HRnkfD2YDzKaUjHInIT.jpg",
      release_date: "2023-12-06",
      vote_average: 7.2,
    },
    {
      id: 7,
      title: "Interestelar",
      poster_path: "/nCbkOyOMTEwlEV0LtCOvCnwEONA.jpg",
      release_date: "2014-11-05",
      vote_average: 8.4,
    },
    {
      id: 8,
      title: "Cidade de Deus",
      poster_path: "/gWxkXmiF43sCoXrSpxI1hMIrS8h.jpg",
      release_date: "2002-08-30",
      vote_average: 8.4,
    },
    {
      id: 9,
      title: "Godzilla e Kong: O Novo Império",
      poster_path: "/rURV5xEne2qBKbZBbbsFXNvGC2h.jpg",
      release_date: "2024-03-27",
      vote_average: 7.0,
    },
    {
      id: 10,
      title: "Oppenheimer",
      poster_path: "/rkZ8pSkS7dxyG1JK2jmchQ2QY2J.jpg",
      release_date: "2023-07-19",
      vote_average: 8.2,
    },
    {
      id: 11,
      title: "Furiosa: Uma Saga Mad Max",
      poster_path: "/gNZ2Hpz0CpHjjSUkUQxQkVZQS3K.jpg",
      release_date: "2024-05-22",
      vote_average: 7.5,
    },
    {
      id: 12,
      title: "Divertida Mente 2",
      poster_path: "/lzWHmYdfeFiMIY4JaMmM3llt1cd.jpg",
      release_date: "2024-06-13",
      vote_average: 8.0,
    },
  ]
}

function getMaxSeries() {
  return [
    {
      id: 1,
      name: "Game of Thrones",
      poster_path: "/mQ9cyw1gfpK1M3a69cgXFHvWkih.jpg",
      first_air_date: "2011-04-17",
      vote_average: 8.4,
    },
    {
      id: 2,
      name: "House of the Dragon",
      poster_path: "/7MBdQsa9aWEPYZ8lzbzrWP4ZMqa.jpg",
      first_air_date: "2022-08-21",
      vote_average: 8.4,
    },
    {
      id: 3,
      name: "The Last of Us",
      poster_path: "/qGu2C4hzODI3wDlCckHPT3E3JGV.jpg",
      first_air_date: "2023-01-15",
      vote_average: 8.7,
    },
    {
      id: 4,
      name: "Succession",
      poster_path: "/f2CnJsIeTwmSp5ZjJJnPtXkGSsf.jpg",
      first_air_date: "2018-06-03",
      vote_average: 8.3,
    },
    {
      id: 5,
      name: "True Detective",
      poster_path: "/loDVB7gx6yYqjh1Hc72Llf5Sr3l.jpg",
      first_air_date: "2014-01-12",
      vote_average: 8.2,
    },
    {
      id: 6,
      name: "The White Lotus",
      poster_path: "/5n7GNCywWE6qfuA8i0fMK2ObUWj.jpg",
      first_air_date: "2021-07-11",
      vote_average: 7.7,
    },
    {
      id: 7,
      name: "Euphoria",
      poster_path: "/3Q0hd3heuWwDWpwcDkhQOA6SKMV.jpg",
      first_air_date: "2019-06-16",
      vote_average: 8.4,
    },
    {
      id: 8,
      name: "Westworld",
      poster_path: "/y55oBgf6bVMI7sFNXwJDrSIxPQt.jpg",
      first_air_date: "2016-10-02",
      vote_average: 8.1,
    },
    {
      id: 9,
      name: "The Penguin",
      poster_path: "/zyN5u6Ow4RErNzA95x7xtYtHxXi.jpg",
      first_air_date: "2024-09-19",
      vote_average: 9.1,
    },
    {
      id: 10,
      name: "Barry",
      poster_path: "/sSprjPCVs2FvjBvR9yvP87O5sib.jpg",
      first_air_date: "2018-03-25",
      vote_average: 8.0,
    },
    {
      id: 11,
      name: "Big Little Lies",
      poster_path: "/tYzaXssIYc0iAfDHXGqzDxA5V95.jpg",
      first_air_date: "2017-02-19",
      vote_average: 7.8,
    },
    {
      id: 12,
      name: "Chernobyl",
      poster_path: "/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg",
      first_air_date: "2019-05-06",
      vote_average: 8.6,
    },
  ]
}

// Adicionar conteúdo específico para o Star+
function getStarPlusMovies() {
  return [
    {
      id: 1,
      title: "Deadpool & Wolverine",
      poster_path: "/8xUVNLZYgvFG8tBQIHZ80Kbs85O.jpg",
      release_date: "2024-07-25",
      vote_average: 9.0,
    },
    {
      id: 2,
      title: "Alien: Romulus",
      poster_path: "/aqK9aAs5WxBzoUt0T0jPTHhvp5Y.jpg",
      release_date: "2024-08-15",
      vote_average: 7.5,
    },
    {
      id: 3,
      title: "Planeta dos Macacos: O Reinado",
      poster_path: "/rfUR45j0BuSvVCgEgJDtDhNsNw5.jpg",
      release_date: "2024-05-09",
      vote_average: 7.0,
    },
    {
      id: 4,
      title: "Kingdom of the Planet of the Apes",
      poster_path: "/rwOqRZZCVPpjSfshH5lhDUYxQml.jpg",
      release_date: "2024-05-08",
      vote_average: 7.0,
    },
    {
      id: 5,
      title: "A Forma da Água",
      poster_path: "/8LmchGz1koK5SUq5AD2MYFmBF6H.jpg",
      release_date: "2017-12-01",
      vote_average: 7.3,
    },
    {
      id: 6,
      title: "O Predador: A Caçada",
      poster_path: "/g7Hu6XUUeDbCFCMP1QczlSNmKJJ.jpg",
      release_date: "2022-08-02",
      vote_average: 7.1,
    },
    {
      id: 7,
      title: "O Menu",
      poster_path: "/1q91aEZgRQfDUKr63GZUei2YMX2.jpg",
      release_date: "2022-11-17",
      vote_average: 7.3,
    },
    {
      id: 8,
      title: "Avatar: O Caminho da Água",
      poster_path: "/7J2sHkR1yVfYSe5UW3B9Qxj5r7o.jpg",
      release_date: "2022-12-14",
      vote_average: 7.6,
    },
    {
      id: 9,
      title: "Bohemian Rhapsody",
      poster_path: "/qxptCNCN4U7tZ9XZWsVAdHR2W5j.jpg",
      release_date: "2018-10-24",
      vote_average: 8.0,
    },
    {
      id: 10,
      title: "O Diabo Veste Prada",
      poster_path: "/4qfzaLDai2zxC8DMHdVjz0XgMQY.jpg",
      release_date: "2006-06-30",
      vote_average: 7.5,
    },
    {
      id: 11,
      title: "Alien: O Oitavo Passageiro",
      poster_path: "/r8dVe1Czx2N7xGvGxBMfFVNGjzz.jpg",
      release_date: "1979-05-25",
      vote_average: 8.1,
    },
    {
      id: 12,
      title: "Pobres Criaturas",
      poster_path: "/xfz4Q9XKtApxm2o1PcNuDzHGpgq.jpg",
      release_date: "2023-12-07",
      vote_average: 7.9,
    },
  ]
}

function getStarPlusSeries() {
  return [
    {
      id: 1,
      name: "The Bear",
      poster_path: "/5d8LBwZIi4otbKPUDYkBCY6R4Y5.jpg",
      first_air_date: "2022-06-23",
      vote_average: 8.5,
    },
    {
      id: 2,
      name: "Only Murders in the Building",
      poster_path: "/5SZ8BGLgFf9SJ5HnYaGJTVQ3hNS.jpg",
      first_air_date: "2021-08-31",
      vote_average: 8.0,
    },
    {
      id: 3,
      name: "Shōgun",
      poster_path: "/bbAaSytxuuLZu72zTpB449pKGjT.jpg",
      first_air_date: "2024-02-27",
      vote_average: 8.6,
    },
    {
      id: 4,
      name: "The Simpsons",
      poster_path: "/k5UALlcA0EnviaCUn2wMjOWYiOO.jpg",
      first_air_date: "1989-12-17",
      vote_average: 8.0,
    },
    {
      id: 5,
      name: "The Walking Dead",
      poster_path: "/n65z9uk35ozcxGYqbV1Z7wb9XzN.jpg",
      first_air_date: "2010-10-31",
      vote_average: 8.1,
    },
    {
      id: 6,
      name: "Grey's Anatomy",
      poster_path: "/eqgIOObafPJitt8JNh1LuO2fvqu.jpg",
      first_air_date: "2005-03-27",
      vote_average: 8.2,
    },
    {
      id: 7,
      name: "How I Met Your Mother",
      poster_path: "/oBerPzBU3t27u0gTPEhpLYN7Qvc.jpg",
      first_air_date: "2005-09-19",
      vote_average: 8.3,
    },
    {
      id: 8,
      name: "Modern Family",
      poster_path: "/rX1aV5lKvzM74ZNR6gAQcLdg1vQ.jpg",
      first_air_date: "2009-09-23",
      vote_average: 8.0,
    },
    {
      id: 9,
      name: "Bob's Burgers",
      poster_path: "/fbsQ4Iup9iroZs3lYwQI2QOmIOY.jpg",
      first_air_date: "2011-01-09",
      vote_average: 7.8,
    },
    {
      id: 10,
      name: "Family Guy",
      poster_path: "/zVoMLfpaGWDW3S6pn2GryVYVDUm.jpg",
      first_air_date: "1999-01-31",
      vote_average: 7.3,
    },
    {
      id: 11,
      name: "American Horror Story",
      poster_path: "/8E1bZ3uXbPmZ9WmDGUYBqV4Xuk6.jpg",
      first_air_date: "2011-10-05",
      vote_average: 8.1,
    },
    {
      id: 12,
      name: "What We Do in the Shadows",
      poster_path: "/rBzuGo8C1uhx687AUh62ZXu4uJi.jpg",
      first_air_date: "2019-03-27",
      vote_average: 8.6,
    },
  ]
}

// Static content functions
function getStaticMovies() {
  return [
    {
      id: 1001,
      title: "Movie 1",
      poster_path: "/path1.jpg",
      release_date: "2023-01-01",
      vote_average: 7.0,
    },
    {
      id: 1002,
      title: "Movie 2",
      poster_path: "/path2.jpg",
      release_date: "2023-02-01",
      vote_average: 7.5,
    },
  ]
}

function getStaticSeries() {
  return [
    {
      id: 2001,
      name: "Series 1",
      poster_path: "/path3.jpg",
      first_air_date: "2023-03-01",
      vote_average: 8.0,
    },
    {
      id: 2002,
      name: "Series 2",
      poster_path: "/path4.jpg",
      first_air_date: "2023-04-01",
      vote_average: 8.5,
    },
  ]
}

document.addEventListener("DOMContentLoaded", () => {
  // Obter parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search)
  const providerId = urlParams.get("id")
  const providerName = urlParams.get("name")

  if (!providerId || !providerName) {
    window.location.href = "streaming-providers.html"
    return
  }

  // Configurar estado inicial
  state.providerId = providerId
  state.providerName = providerName

  // Configurar a página
  setupPage()

  // Carregar conteúdo inicial
  loadProviderContent("movie", 1)

  // Configurar eventos de tabs
  setupTabEvents()
})

function setupPage() {
  // Atualizar título da página
  document.title = `${state.providerName} - MOX Streaming`

  // Atualizar nome do provedor
  document.getElementById("provider-name").textContent = state.providerName

  // Carregar logo do provedor
  loadProviderLogo()

  // Aplicar cor do provedor ao header
  applyProviderColor()
}

async function loadProviderLogo() {
  try {
    // Verificar se é Star+ (ID 619)
    if (state.providerId === "619") {
      // Usar a imagem fornecida pelo usuário
      state.providerLogo = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/star%2B-bP4bP3lMGn1EkoVv5MBVXxLhsvGr44.png"
      document.getElementById("provider-logo").src = state.providerLogo
      document.getElementById("provider-logo").alt = "Star+"
      return
    }
    
    // Para outros provedores, usar a API normalmente
    const response = await fetch(`${baseURL}watch/providers/movie?api_key=${movieApiKey}&language=pt-BR`)
    if (!response.ok) throw new Error("Falha ao carregar detalhes do provedor")

    const data = await response.json()
    const provider = data.results.find((p) => p.provider_id.toString() === state.providerId)

    if (provider && provider.logo_path) {
      state.providerLogo = `https://image.tmdb.org/t/p/original${provider.logo_path}`
      document.getElementById("provider-logo").src = state.providerLogo
      document.getElementById("provider-logo").alt = state.providerName
    } else {
      // Fallback para logos específicas se a API não retornar
      const fallbackLogos = {
        "384": "https://image.tmdb.org/t/p/original/aS2zvJWn9mwiCOeaaCkIh4wleZS.jpg", // Max
        "8": "https://image.tmdb.org/t/p/original/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg", // Netflix
        "337": "https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg", // Disney+
        "119": "https://image.tmdb.org/t/p/original/68MNrwlkpF7WnmNPXLah69CR5cb.jpg", // Prime Video
      }
      
      if (fallbackLogos[state.providerId]) {
        state.providerLogo = fallbackLogos[state.providerId]
        document.getElementById("provider-logo").src = state.providerLogo
        document.getElementById("provider-logo").alt = state.providerName
      } else {
        // Se não houver logo, usar um placeholder
        document.getElementById("provider-logo").src = "/placeholder.svg?height=50&width=50"
        document.getElementById("provider-logo").alt = state.providerName
      }
    }
  } catch (error) {
    console.error("Erro ao carregar logo do provedor:", error)
    
    // Em caso de erro, usar logos específicas para provedores conhecidos
    const fallbackLogos = {
      "619": "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/star%2B-bP4bP3lMGn1EkoVv5MBVXxLhsvGr44.png", // Star+ (usando a imagem fornecida)
      "384": "https://image.tmdb.org/t/p/original/aS2zvJWn9mwiCOeaaCkIh4wleZS.jpg", // Max
      "8": "https://image.tmdb.org/t/p/original/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg", // Netflix
      "337": "https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg", // Disney+
      "119": "https://image.tmdb.org/t/p/original/68MNrwlkpF7WnmNPXLah69CR5cb.jpg", // Prime Video
    }
    
    if (fallbackLogos[state.providerId]) {
      state.providerLogo = fallbackLogos[state.providerId]
      document.getElementById("provider-logo").src = state.providerLogo
      document.getElementById("provider-logo").alt = state.providerName
    } else {
      // Se não houver logo, usar um placeholder
      document.getElementById("provider-logo").src = "/placeholder.svg?height=50&width=50"
      document.getElementById("provider-logo").alt = state.providerName
    }
  }
}

function applyProviderColor() {
  const color = providerColors[state.providerId] || "#9333ea" // Cor padrão se não encontrar

  // Aplicar cor ao header
  const header = document.getElementById("provider-header")
  header.style.backgroundColor = color

  // Aplicar cor aos botões de paginação ativos
  document.documentElement.style.setProperty("--provider-color", color)
}

function setupTabEvents() {
  const tabs = document.querySelectorAll(".tab-button")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remover classe ativa de todas as tabs
      tabs.forEach((t) => t.classList.remove("active"))

      // Adicionar classe ativa à tab clicada
      tab.classList.add("active")

      // Atualizar tipo de conteúdo
      const type = tab.getAttribute("data-type")
      state.currentType = type
      state.currentPage = 1

      // Carregar conteúdo
      loadProviderContent(type, 1)
    })
  })
}

