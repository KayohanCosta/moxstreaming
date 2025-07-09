const movieApiKey = "5768cb6af3cda69c23d9b4075c0aac34"
const baseURL = "https://api.themoviedb.org/3/"

// Estado global
const state = {
  query: "",
  currentPage: 1,
  totalPages: 0,
  results: [],
  filter: "all", // 'all', 'movie', 'tv'
}

document.addEventListener("DOMContentLoaded", () => {
  // Obter parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search)
  const query = urlParams.get("query")

  if (!query) {
    showNoResults("Por favor, digite um termo de pesquisa.")
    return
  }

  // Configurar estado inicial
  state.query = query

  // Preencher o campo de pesquisa com a consulta atual
  document.getElementById("search-input").value = query
  document.getElementById("search-input-mobile").value = query

  // Atualizar título da página
  document.title = `"${query}" - Resultados da Pesquisa - MOX Streaming`
  document.getElementById("search-title").textContent = `Resultados para "${query}"`

  // Carregar resultados
  searchContent(query, 1)

  // Configurar filtros
  setupFilters()
})

function setupFilters() {
  const filterMovies = document.getElementById("filter-movies")
  const filterTv = document.getElementById("filter-tv")
  const filterAll = document.getElementById("filter-all")

  filterMovies.addEventListener("click", () => {
    setActiveFilter("movie")
    filterMovies.classList.add("bg-purple-600")
    filterMovies.classList.remove("bg-dark-700")

    filterTv.classList.remove("bg-purple-600")
    filterTv.classList.add("bg-dark-700")

    filterAll.classList.remove("bg-purple-600")
    filterAll.classList.add("bg-dark-700")
  })

  filterTv.addEventListener("click", () => {
    setActiveFilter("tv")
    filterTv.classList.add("bg-purple-600")
    filterTv.classList.remove("bg-dark-700")

    filterMovies.classList.remove("bg-purple-600")
    filterMovies.classList.add("bg-dark-700")

    filterAll.classList.remove("bg-purple-600")
    filterAll.classList.add("bg-dark-700")
  })

  filterAll.addEventListener("click", () => {
    setActiveFilter("all")
    filterAll.classList.add("bg-purple-600")
    filterAll.classList.remove("bg-dark-700")

    filterMovies.classList.remove("bg-purple-600")
    filterMovies.classList.add("bg-dark-700")

    filterTv.classList.remove("bg-purple-600")
    filterTv.classList.add("bg-dark-700")
  })
}

function setActiveFilter(filter) {
  state.filter = filter
  displayResults()
}

async function searchContent(query, page) {
  try {
    showLoading()

    // Fazer a pesquisa multi (filmes, séries, pessoas)
    const response = await fetch(
      `${baseURL}search/multi?api_key=${movieApiKey}&language=pt-BR&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
    )

    if (!response.ok) throw new Error(`Falha na pesquisa`)

    const data = await response.json()

    // Atualizar estado
    state.results = data.results.filter((item) => item.media_type === "movie" || item.media_type === "tv")
    state.currentPage = data.page
    state.totalPages = Math.min(data.total_pages, 20) // Limitar a 20 páginas

    // Exibir resultados
    displayResults()

    // Atualizar paginação
    updatePagination()
  } catch (error) {
    console.error(`Erro na pesquisa:`, error)
    document.getElementById("search-results").innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-red-500 mb-2">Erro ao realizar a pesquisa</p>
                <button onclick="searchContent('${query}', ${page})" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
                    Tentar novamente
                </button>
            </div>
        `
  }
}

// Modificar a função displayResults para usar o mesmo estilo de cards da página inicial
function displayResults() {
  const grid = document.getElementById("search-results")

  // Filtrar resultados com base no filtro atual
  let filteredResults = state.results
  if (state.filter === "movie") {
    filteredResults = state.results.filter((item) => item.media_type === "movie")
  } else if (state.filter === "tv") {
    filteredResults = state.results.filter((item) => item.media_type === "tv")
  }

  if (filteredResults.length === 0) {
    showNoResults("Nenhum resultado encontrado para sua pesquisa.")
    return
  }

  grid.innerHTML = filteredResults
    .map((item) => {
      const title = item.title || item.name
      const releaseDate = item.release_date || item.first_air_date
      const year = releaseDate ? new Date(releaseDate).getFullYear() : ""
      const rating = item.vote_average ? Math.round(item.vote_average * 10) : "N/A"
      const type = item.media_type === "movie" ? "filme" : "serie"
      const typeBadge = item.media_type === "movie" ? "Filme" : "Série"

      return `
        <div class="bg-dark-800 rounded-lg overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-lg">
          <a href="detalhes.html?id=${item.id}&type=${type}">
            <div class="relative pb-[150%]">
              <img src="${item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : "/placeholder.svg?height=513&width=342"}" 
                   alt="${title}" 
                   class="absolute top-0 left-0 w-full h-full object-cover transition-opacity hover:opacity-80"
                   onerror="this.onerror=null; this.src='/placeholder.svg?height=513&width=342';">
              <div class="content-type-badge">${typeBadge}</div>
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

function showNoResults(message) {
  document.getElementById("search-results").innerHTML = `
        <div class="col-span-full text-center py-10">
            <p class="text-gray-400 mb-4">${message}</p>
            <a href="index.html" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded inline-block">
                Voltar para a página inicial
            </a>
        </div>
    `

  // Esconder paginação
  document.getElementById("pagination").innerHTML = ""
}

// Declare lucide if it's not already defined
let lucide

function updatePagination() {
  const pagination = document.getElementById("pagination")

  if (state.totalPages <= 1) {
    pagination.innerHTML = ""
    return
  }

  let paginationHTML = ""

  // Botão anterior
  paginationHTML += `
        <button class="pagination-button ${state.currentPage === 1 ? "disabled" : ""}" 
                ${state.currentPage === 1 ? "disabled" : `onclick="changePage(${state.currentPage - 1})"`}>
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
                ${state.currentPage === state.totalPages ? "disabled" : `onclick="changePage(${state.currentPage + 1})"`}>
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
        </button>
    `

  pagination.innerHTML = paginationHTML

  // Inicializar ícones
  if (typeof lucide !== "undefined") {
    lucide.createIcons()
  }
}

function changePage(page) {
  if (page < 1 || page > state.totalPages || page === state.currentPage) {
    return
  }

  searchContent(state.query, page)

  // Rolar para o topo
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function showLoading() {
  document.getElementById("search-results").innerHTML = `
        <div class="flex justify-center items-center col-span-full py-10">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    `
}

