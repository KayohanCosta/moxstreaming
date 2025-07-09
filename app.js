const apiKey = "5768cb6af3cda69c23d9b4075c0aac34"
const fanartApiKey = "bd7e6181c8dfa6e5c94b9c540d4c93da"
const baseURL = "https://api.themoviedb.org/3/"

// Configuração de imagens
const imageConfig = {
  backdrop_sizes: ["w300", "w780", "w1280", "original"],
  logo_sizes: ["w45", "w92", "w154", "w185", "w300", "w500", "original"],
  poster_sizes: ["w92", "w154", "w185", "w342", "w500", "w780", "original"],
}

// Endpoints atualizados para cada categoria
const movieEndpoint = `${baseURL}movie/popular?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&vote_count.gte=1000`
const seriesEndpoint = `${baseURL}tv/top_rated?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&vote_count.gte=1000`
const animeEndpoint = `${baseURL}discover/tv?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&with_genres=16&with_keywords=210024|222243&vote_count.gte=100`
const doramasEndpoint = `${baseURL}discover/tv?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&with_original_language=ko|ja|zh&without_genres=16&vote_count.gte=50`
const novelasEndpoint = `${baseURL}discover/tv?api_key=${apiKey}&language=pt-BR&sort_by=popularity.desc&with_origin_country=BR&with_genres=18&without_keywords=210024|222243&vote_count.gte=20`

// Função para buscar o Top 10 Brasil
async function fetchTop10Brasil() {
  try {
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(`${baseURL}trending/movie/day?api_key=${apiKey}&language=pt-BR&region=BR`),
      fetch(`${baseURL}trending/tv/day?api_key=${apiKey}&language=pt-BR&region=BR`),
    ])

    const [movieData, tvData] = await Promise.all([movieResponse.json(), tvResponse.json()])

    if (!movieData.results || !tvData.results) {
      throw new Error("Dados inválidos recebidos da API")
    }

    const combinedResults = [...movieData.results, ...tvData.results]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10)
      .map((item) => ({
        ...item,
        media_type: item.first_air_date ? "tv" : "movie",
      }))

    // Buscar detalhes adicionais e logos do fanart.tv para cada item
    const detailedResults = await Promise.all(
      combinedResults.map(async (item) => {
        try {
          const [detailsResponse, fanartResponse] = await Promise.all([
            fetch(`${baseURL}${item.media_type}/${item.id}?api_key=${apiKey}&language=pt-BR&append_to_response=images`),
            fetch(
              `http://webservice.fanart.tv/v3/${item.media_type === "movie" ? "movies" : "tv"}/${item.id}?api_key=${fanartApiKey}`,
            ),
          ])
          const [details, fanartData] = await Promise.all([detailsResponse.json(), fanartResponse.json()])

          // Extrair o logo do fanart.tv
          let logo = null
          if (item.media_type === "movie" && fanartData.hdmovielogo && fanartData.hdmovielogo.length > 0) {
            logo = fanartData.hdmovielogo.find((l) => l.lang === "pt") || fanartData.hdmovielogo[0]
            logo = logo ? logo.url : null
          } else if (item.media_type === "tv" && fanartData.hdtvlogo && fanartData.hdtvlogo.length > 0) {
            logo = fanartData.hdtvlogo.find((l) => l.lang === "pt") || fanartData.hdtvlogo[0]
            logo = logo ? logo.url : null
          }

          return { ...item, ...details, fanartLogo: logo }
        } catch (error) {
          console.error(`Erro ao buscar detalhes para ${item.title || item.name}:`, error)
          return item
        }
      }),
    )

    displayTop10(detailedResults)
    initializeTop10Swiper()
  } catch (error) {
    console.error("Erro ao buscar Top 10:", error)
    const container = document.getElementById("top-10-content")
    if (container) {
      container.innerHTML =
        '<p class="text-center text-red-500">Erro ao carregar o Top 10. Por favor, tente novamente mais tarde.</p>'
    }
  }
}

// Função para exibir o Top 10
function displayTop10(items) {
  const container = document.getElementById("top-10-content")
  if (!container) return

  container.innerHTML = items
    .map((item, index) => {
      const backdropPath = item.backdrop_path || item.images?.backdrops?.[0]?.file_path
      const title = item.title || item.name
      const releaseDate = (item.release_date || item.first_air_date || "").split("-")[0]
      const rating = Math.round(item.vote_average * 10)

      return `
        <div class="swiper-slide relative group cursor-pointer" onclick="redirectToMediaInfo(${item.id}, '${item.media_type === "tv" ? "serie" : "filme"}')">
          <div class="relative aspect-video rounded-lg overflow-hidden bg-dark-700">
            <div class="ranking-number text-lg">#${index + 1}</div>
            <img 
              src="${backdropPath ? `https://image.tmdb.org/t/p/w780${backdropPath}` : "/placeholder.svg?height=439&width=780"}"
              alt="${title}"
              class="w-full h-full object-cover"
              onerror="this.onerror=null; this.src='/placeholder.svg?height=439&width=780';"
            >
            <div class="content-info">
              <h3 class="text-lg font-bold mb-2">${title}</h3>
              <div class="flex items-center text-sm">
                <span class="mr-3">${releaseDate}</span>
                <span class="flex items-center">
                  <span class="rating-star">★</span>
                  ${rating}%
                </span>
              </div>
            </div>
          </div>
        </div>
      `
    })
    .join("")
}

// Função para inicializar o Swiper do Top 10
function initializeTop10Swiper() {
  // Importando o Swiper aqui para garantir que esteja disponível
  if (typeof Swiper === "undefined") {
    console.error("Swiper is not defined. Please include the Swiper library.")
    return
  }
  new Swiper(".top10Swiper", {
    slidesPerView: 1,
    spaceBetween: 20,
    grabCursor: true,
    loop: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    breakpoints: {
      640: { slidesPerView: 2 },
      768: { slidesPerView: 3 },
      1024: { slidesPerView: 4 },
      1280: { slidesPerView: 5 },
    },
  })
}

// Função para buscar e exibir mídia (filmes, séries, animes, doramas ou novelas)
async function fetchAndDisplayMedia(endpoint, containerId, mediaType, page = 1) {
  console.log(`Fetching page ${page} for ${mediaType} in ${containerId}`)
  try {
    const response = await fetch(`${endpoint}&page=${page}`)
    const data = await response.json()
    const container = document.getElementById(containerId)

    if (!container) {
      console.error(`Container "${containerId}" não encontrado.`)
      return
    }

    const mediaHTML = data.results
      .filter((item) => item.poster_path)
      .map((item) => createMediaCard(item, mediaType))
      .join("")

    container.innerHTML = mediaHTML

    // Adiciona botões de paginação se houver mais de uma página
    if (data.total_pages > 1) {
      addPaginationButtons(data.total_pages, containerId, mediaType, page)
    }
  } catch (error) {
    console.error(`Erro ao buscar ${mediaType}:`, error)
  }
}

// Função atualizada para adicionar botões de paginação
function addPaginationButtons(totalPages, containerId, mediaType, currentPage) {
  const paginationContainer = document.getElementById(`${containerId}-pagination`)
  if (!paginationContainer) return

  const maxButtons = 5
  let startPage = Math.max(currentPage - Math.floor(maxButtons / 2), 1)
  const endPage = Math.min(startPage + maxButtons - 1, totalPages)

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(endPage - maxButtons + 1, 1)
  }

  let paginationHTML = `
    <div class="flex flex-wrap justify-center items-center gap-2">
      <button class="pagination-btn bg-dark-700 text-white px-3 py-1 rounded-md ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}" 
              onclick="changePage(${currentPage - 1}, '${containerId}', '${mediaType}')"
              ${currentPage === 1 ? "disabled" : ""}>
        Anterior
      </button>
  `

  for (let page = startPage; page <= endPage; page++) {
    paginationHTML += `
      <button class="pagination-btn ${page === currentPage ? "bg-purple-600" : "bg-dark-700"} text-white px-3 py-1 rounded-md" 
              onclick="changePage(${page}, '${containerId}', '${mediaType}')">
        ${page}
      </button>
    `
  }

  paginationHTML += `
      <button class="pagination-btn bg-dark-700 text-white px-3 py-1 rounded-md ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}" 
              onclick="changePage(${currentPage + 1}, '${containerId}', '${mediaType}')"
              ${currentPage === totalPages ? "disabled" : ""}>
        Próxima
      </button>
    </div>
  `

  paginationContainer.innerHTML = paginationHTML
}

// Função atualizada para mudar de página
function changePage(page, containerId, mediaType) {
  console.log(`Changing to page ${page} for ${mediaType} in ${containerId}`)
  const endpoint = getEndpointForMediaType(mediaType)
  fetchAndDisplayMedia(endpoint, containerId, mediaType, page)
}

function getEndpointForMediaType(mediaType) {
  switch (mediaType) {
    case "filme":
      return movieEndpoint
    case "serie":
      return seriesEndpoint
    case "anime":
      return animeEndpoint
    case "dorama":
      return doramasEndpoint
    case "novela":
      return novelasEndpoint
    default:
      return movieEndpoint
  }
}

// Função para criar um cartão de mídia (filme, série, anime, dorama ou novela)
function createMediaCard(item, mediaType) {
  const posterPath = `https://image.tmdb.org/t/p/w500/${item.poster_path}`
  const rating = Math.round(item.vote_average * 10)
  const title = item.title || item.name
  const releaseDate = (item.release_date || item.first_air_date || "").split("-")[0]

  return `
    <div class="relative group cursor-pointer" onclick="redirectToMediaInfo(${item.id}, '${mediaType}')">
      <div class="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800">
        <img src="${posterPath}" alt="${title}" 
             class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
             onerror="this.onerror=null; this.src='/placeholder.svg?height=750&width=500';">
      </div>
      <div class="mt-2">
        <h3 class="text-sm font-medium truncate">${title}</h3>
        <div class="flex items-center text-xs text-gray-400">
          <span>${releaseDate}</span>
          <span class="ml-2 flex items-center">
            <svg class="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            ${rating}%
          </span>
        </div>
      </div>
    </div>
  `
}

// Função atualizada para redirecionar para a página de detalhes
function redirectToMediaInfo(id, mediaType) {
  window.location.href = `detalhes.html?id=${id}&type=${mediaType}`
}

// Função para buscar mídia por termo de pesquisa
async function searchMedia() {
  const searchTerm = document.getElementById("search-input").value
  if (!searchTerm.trim()) {
    // Se a busca estiver vazia, recarrega os conteúdos originais
    fetchAndDisplayMedia(movieEndpoint, "popular-movies", "filme", 1)
    fetchAndDisplayMedia(seriesEndpoint, "popular-series", "serie", 1)
    fetchAndDisplayMedia(animeEndpoint, "popular-animes", "anime", 1)
    fetchAndDisplayMedia(doramasEndpoint, "popular-doramas", "dorama", 1)
    fetchAndDisplayMedia(novelasEndpoint, "popular-novelas", "novela", 1)
    return
  }

  try {
    const movieSearchEndpoint = `${baseURL}search/movie?api_key=${apiKey}&language=pt-BR&query=${searchTerm}&sort_by=popularity.desc&vote_count.gte=1000`
    const seriesSearchEndpoint = `${baseURL}search/tv?api_key=${apiKey}&language=pt-BR&query=${searchTerm}&sort_by=popularity.desc&vote_count.gte=1000&without_genres=16&without_keywords=210024|222243`
    const animeSearchEndpoint = `${baseURL}search/tv?api_key=${apiKey}&language=pt-BR&query=${searchTerm}&sort_by=popularity.desc&with_genres=16&with_keywords=210024|222243&vote_count.gte=100`
    const doramasSearchEndpoint = `${baseURL}search/tv?api_key=${apiKey}&language=pt-BR&query=${searchTerm}&sort_by=popularity.desc&with_original_language=ko|ja|zh&without_genres=16&vote_count.gte=50`
    const novelasSearchEndpoint = `${baseURL}search/tv?api_key=${apiKey}&language=pt-BR&query=${searchTerm}&sort_by=popularity.desc&with_origin_country=BR&with_genres=18&without_keywords=210024|222243&vote_count.gte=20`

    const [movieResponse, seriesResponse, animeResponse, doramasResponse, novelasResponse] = await Promise.all([
      fetch(movieSearchEndpoint),
      fetch(seriesSearchEndpoint),
      fetch(animeSearchEndpoint),
      fetch(doramasSearchEndpoint),
      fetch(novelasSearchEndpoint),
    ])

    const [movieData, seriesData, animeData, doramasData, novelasData] = await Promise.all([
      movieResponse.json(),
      seriesResponse.json(),
      animeResponse.json(),
      doramasResponse.json(),
      novelasResponse.json(),
    ])

    // Atualiza os containers com os resultados da busca
    updateMediaContainer("popular-movies", movieData, "filme", 1)
    updateMediaContainer("popular-series", seriesData, "serie", 1)
    updateMediaContainer("popular-animes", animeData, "anime", 1)
    updateMediaContainer("popular-doramas", doramasData, "dorama", 1)
    updateMediaContainer("popular-novelas", novelasData, "novela", 1)
  } catch (error) {
    console.error("Erro ao buscar mídia:", error)
  }
}

// Função auxiliar para atualizar os containers de mídia
function updateMediaContainer(containerId, data, mediaType, page = 1) {
  const container = document.getElementById(containerId)
  if (container) {
    container.innerHTML = data.results
      .filter((item) => item.poster_path)
      .map((item) => createMediaCard(item, mediaType))
      .join("")

    // Atualiza a paginação
    addPaginationButtons(data.total_pages, containerId, mediaType, page)
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Carregar o Top 10 Brasil
  fetchTop10Brasil()

  // Carrega o conteúdo inicial
  fetchAndDisplayMedia(movieEndpoint, "popular-movies", "filme")
  fetchAndDisplayMedia(seriesEndpoint, "popular-series", "serie")
  fetchAndDisplayMedia(animeEndpoint, "popular-animes", "anime")
  fetchAndDisplayMedia(doramasEndpoint, "popular-doramas", "dorama")
  fetchAndDisplayMedia(novelasEndpoint, "popular-novelas", "novela")

  // Adiciona evento de busca com debounce
  const searchInput = document.getElementById("search-input")
  let debounceTimer

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(searchMedia, 500)
  })
})

