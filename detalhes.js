const movieApiKey = "5768cb6af3cda69c23d9b4075c0aac34"
const fanartApiKey = "bd7e6181c8dfa6e5c94b9c540d4c93da"
const baseURL = "https://api.themoviedb.org/3/"

// Estado global
const state = {
  currentContent: null,
  currentSeason: null,
  currentEpisode: null,
}

// Declaração das funções não declaradas
function displayError(message) {
  console.error(message)
  // Exibe a mensagem de erro em um elemento HTML, se disponível
  const errorContainer = document.getElementById("error-container")
  if (errorContainer) {
    errorContainer.textContent = message
  }
}

function createReadMore(element, text) {
  const maxLength = 300 // Número máximo de caracteres a serem exibidos inicialmente
  let truncatedText = text.substr(0, maxLength)

  // Verifica se o texto precisa ser truncado
  if (text.length > maxLength) {
    truncatedText = truncatedText.substr(0, Math.min(truncatedText.length, truncatedText.lastIndexOf(" "))) + "..."

    // Cria os elementos "Ler mais" e "Ler menos"
    const readMoreSpan = document.createElement("span")
    readMoreSpan.innerHTML = ' <a href="#" style="color: #aaa;">Ler mais</a>'
    readMoreSpan.style.cursor = "pointer"

    const fullTextSpan = document.createElement("span")
    fullTextSpan.textContent = text.substr(maxLength)
    fullTextSpan.style.display = "none"

    const readLessSpan = document.createElement("span")
    readLessSpan.innerHTML = ' <a href="#" style="color: #aaa;">Ler menos</a>'
    readLessSpan.style.cursor = "pointer"
    readLessSpan.style.display = "none"

    // Adiciona os eventos de clique para mostrar/esconder o texto completo
    readMoreSpan.addEventListener("click", (event) => {
      event.preventDefault()
      fullTextSpan.style.display = "inline"
      readLessSpan.style.display = "inline"
      readMoreSpan.style.display = "none"
    })

    readLessSpan.addEventListener("click", (event) => {
      event.preventDefault()
      fullTextSpan.style.display = "none"
      readLessSpan.style.display = "none"
      readMoreSpan.style.display = "inline"
    })

    // Adiciona os elementos ao elemento original
    element.textContent = truncatedText
    element.appendChild(readMoreSpan)
    element.appendChild(fullTextSpan)
    element.appendChild(readLessSpan)
  } else {
    element.textContent = text
  }
}

function getNextEpisodeData(currentSeason, currentEpisode, totalEpisodes) {
  if (!currentSeason || !currentEpisode || !totalEpisodes) {
    return null
  }

  let nextSeason = Number.parseInt(currentSeason)
  let nextEpisode = Number.parseInt(currentEpisode) + 1

  if (nextEpisode > totalEpisodes) {
    nextSeason += 1
    nextEpisode = 1
  }

  return { nextSeason: nextSeason, nextEpisode: nextEpisode }
}

function getTotalEpisodesForCurrentSeason() {
  // Tenta obter o número total de episódios da interface do usuário
  const episodesList = document.getElementById("episodes-list")
  if (episodesList) {
    const episodeElements = episodesList.querySelectorAll(".bg-gray-800") // Ajuste o seletor conforme necessário
    return episodeElements.length
  }

  return null // Retorna null se não for possível determinar
}

function createPlayerContainer() {
  // Verifica se o container já existe
  let playerContainer = document.getElementById("player-container")

  // Se não existir, cria o container
  if (!playerContainer) {
    playerContainer = document.createElement("div")
    playerContainer.id = "player-container"
    playerContainer.className = "fixed inset-0 bg-black z-50 flex items-center justify-center"
    document.body.appendChild(playerContainer)
  }

  return playerContainer
}

function closePlayer() {
  const playerContainer = document.getElementById("player-container")
  if (playerContainer) {
    playerContainer.remove()
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search)
  const id = urlParams.get("id")
  const type = urlParams.get("type")
  const name = urlParams.get("name") // Adicionando o parâmetro de nome

  if (id && type) {
    fetchDetails(id, type)
  } else if (name && type) {
    fetchLogoFromTMDBByName(name, type) // Chama a nova função se o nome for fornecido
  } else {
    displayError("ID ou tipo não fornecido na URL")
  }
})

async function fetchDetails(id, type) {
  try {
    const endpoint = getEndpoint(id, type)
    const response = await fetch(endpoint)
    if (!response.ok) throw new Error("Falha na requisição à API do TMDB")
    const data = await response.json()

    state.currentContent = { ...data, type }

    if (type === "filme") {
      await fetchFanartLogo(id) // Busca logo apenas para filmes
    } else {
      await fetchLogoFromTMDB(id, type) // Busca logo usando TMDb para outros tipos
    }

    displayDetails()

    // Buscar e exibir conteúdo relacionado
    const relatedContent = await fetchRelatedContent(id, type)
    displayRelatedContent(relatedContent)

    if (type !== "filme") {
      await fetchSeasons(id) // Busca temporadas apenas para séries
    }
  } catch (error) {
    displayError(`Erro ao buscar detalhes: ${error.message}`)
  }
}

async function fetchRelatedContent(id, type) {
  try {
    const contentType = type === "filme" ? "movie" : "tv"
    const endpoint = `${baseURL}${contentType}/${id}/recommendations?api_key=${movieApiKey}&language=pt-BR`
    const response = await fetch(endpoint)

    if (!response.ok) {
      console.warn("Falha ao buscar conteúdo relacionado. Continuando sem recomendações.")
      return []
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.warn("Erro ao buscar conteúdo relacionado:", error)
    return []
  }
}

async function fetchFanartLogo(id) {
  try {
    const response = await fetch(`https://webservice.fanart.tv/v3/movies/${id}?api_key=${fanartApiKey}`)

    if (!response.ok) {
      console.warn("Falha na requisição à API do Fanart.tv. Continuando sem o logo.")
      return
    }

    const data = await response.json()
    const logoTypes = [
      { key: "hdmovielogo", textlessKey: "hdmovielogo" },
      { key: "movielogo", textlessKey: "movielogo" },
      { key: "clearlogo", textlessKey: "clearlogo" },
    ]

    let logo = null
    let logoLanguage = null

    for (const { key, textlessKey } of logoTypes) {
      if (data[key] && data[key].length > 0) {
        const ptLogo = data[key].find((l) => l.lang === "pt")
        const enLogo = data[key].find((l) => l.lang === "en")

        if (ptLogo) {
          logo = ptLogo.url
          logoLanguage = "pt-BR"
          break
        } else if (enLogo) {
          logo = enLogo.url
          logoLanguage = "en"
          break
        }
      }

      // Verificar logos sem texto se nenhum logo específico de idioma foi encontrado
      if (data[textlessKey] && data[textlessKey].length > 0) {
        logo = data[textlessKey][0].url
        logoLanguage = "textless"
        break
      }
    }

    if (logo) {
      state.currentContent.fanartLogo = logo
      state.currentContent.logoLanguage = logoLanguage
    } else {
      console.warn("Nenhum logo encontrado no Fanart.tv")
    }
  } catch (error) {
    console.warn("Erro ao buscar logo do Fanart.tv:", error)
  }
}

async function fetchLogoFromTMDB(id, type) {
  try {
    const contentType = type === "filme" ? "movie" : "tv"
    const response = await fetch(`https://api.themoviedb.org/3/${contentType}/${id}/images?api_key=${movieApiKey}`)

    if (!response.ok) {
      console.warn("Falha na requisição à API do TMDb. Continuando sem o logo.")
      return
    }

    const data = await response.json()
    const logos = data.logos // Obter logos da resposta

    if (logos && logos.length > 0) {
      // Pega o primeiro logo disponível
      const logo = logos[0].file_path
      state.currentContent.fanartLogo = `https://image.tmdb.org/t/p/original${logo}`
      state.currentContent.logoLanguage = logos[0].language // Se necessário
    } else {
      console.warn("Nenhum logo encontrado na TMDb")
    }
  } catch (error) {
    console.warn("Erro ao buscar logo do TMDb:", error)
  }
}

async function fetchLogoFromTMDBByName(name, type) {
  try {
    const searchType = type === "filme" ? "movie" : "tv"
    const response = await fetch(
      `https://api.themoviedb.org/3/search/${searchType}?api_key=${movieApiKey}&language=pt-BR&query=${encodeURIComponent(name)}`,
    )

    if (!response.ok) throw new Error("Falha na requisição à API do TMDB")

    const data = await response.json()
    if (data.results.length > 0) {
      const contentId = data.results[0].id // Pega o ID do primeiro resultado
      await fetchLogoFromTMDB(contentId, type) // Busca a logo usando o ID
    } else {
      console.warn("Nenhum conteúdo encontrado com esse nome.")
    }
  } catch (error) {
    console.error("Erro ao buscar logo pelo nome:", error)
  }
}

function getEndpoint(id, type) {
  const isMovie = type === "filme"
  const contentType = isMovie ? "movie" : "tv"
  return `${baseURL}${contentType}/${id}?api_key=${movieApiKey}&language=pt-BR&append_to_response=credits,watch/providers`
}

function getFanartType(type) {
  switch (type) {
    case "filme":
      return "movies"
    case "serie":
    case "anime":
    case "dorama":
    case "novela":
      return "tv"
    default:
      return "tv" // Padrão para tipos desconhecidos
  }
}

function displayDetails() {
  const { currentContent } = state
  if (!currentContent) return

  const container = document.getElementById("detalhes-container")
  if (!container) return

  const {
    backdrop_path,
    title,
    name,
    release_date,
    first_air_date,
    vote_average,
    overview,
    genres,
    credits,
    fanartLogo,
    logoLanguage,
    type,
  } = currentContent

  const backdropUrl = backdrop_path
    ? `https://image.tmdb.org/t/p/original${backdrop_path}`
    : "/placeholder.svg?height=780&width=1280"
  const contentTitle = title || name
  const releaseYear = (release_date || first_air_date || "").split("-")[0]
  const rating = Math.round(vote_average * 10)
  const directors = credits.crew.filter((person) => person.job === "Director").map((director) => director.name)
  const cast = credits.cast
    .slice(0, 3)
    .map((actor) => actor.name)
    .join(", ")

  container.innerHTML = `
  <div class="relative min-h-screen">
    <div class="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10"></div>
    <img src="${backdropUrl}" alt="" class="absolute inset-0 w-full h-full object-cover">
    
    <div class="relative z-20 container mx-auto px-4 py-20">
      ${
        fanartLogo
          ? `
        <div class="max-w-md mb-4">
          <img src="${fanartLogo}" alt="${contentTitle}" class="w-full h-auto object-contain" style="filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">
          ${logoLanguage && logoLanguage !== "textless" ? `<p class="text-xs text-gray-400">Logo em ${logoLanguage.toUpperCase()}</p>` : ""}
        </div>
      `
          : `<h1 class="text-4xl md:text-6xl font-serif mb-4">${contentTitle}</h1>`
      }
      
      <div class="flex flex-wrap items-center gap-4 text-sm mb-6">
        <span>${releaseYear}</span>
        <div class="flex items-center bg-yellow-500 px-2 rounded">
          <span class="font-bold">${rating}%</span>
        </div>
      </div>

      <div class="space-y-6 max-w-2xl mb-8">
        ${
          genres && genres.length
            ? `
          <div>
            <h3 class="text-gray-400 uppercase text-sm mb-2">GÊNEROS</h3>
            <div class="flex flex-wrap gap-2">
              ${genres.map((genre) => `<span class="px-3 py-1 bg-gray-800 rounded-full text-sm">${genre.name}</span>`).join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          cast
            ? `
          <div>
            <h3 class="text-gray-400 uppercase text-sm mb-2">ELENCO</h3>
            <div class="text-sm">${cast}</div>
          </div>
        `
            : ""
        }

        ${
          directors.length
            ? `
          <div>
            <h3 class="text-gray-400 uppercase text-sm mb-2">DIRETOR</h3>
            <div class="text-sm">${directors.join(", ")}</div>
          </div>
        `
            : ""
        }

        ${
          overview
            ? `
          <div>
            <h3 class="text-gray-400 uppercase text-sm mb-2">SINOPSE</h3>
            <div class="text-sm" id="sinopse"></div>
          </div>
        `
            : ""
        }

        <div class="flex flex-wrap gap-4 pt-4">
          ${
            type === "filme"
              ? `
              <button onclick="watchContent()" 
                      class="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Assistir</span>
              </button>
              `
              : ""
          }
          <button onclick="openTrailer()" 
                  class="flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
            </svg>
            <span>Trailer</span>
          </button>
        </div>

        <div class="mt-8">
          <h3 class="text-gray-400 uppercase text-sm mb-4">ELENCO PRINCIPAL</h3>
          <div class="cast-scroll-container">
            <div class="cast-scroll flex space-x-4 overflow-x-auto pb-4 scrollbar-custom">
              ${credits.cast
                .slice(0, 5)
                .map(
                  (actor) => `
                <div class="flex-shrink-0 w-24">
                  <div class="bg-gray-800 rounded-lg overflow-hidden">
                    <img 
                      src="${actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : "/placeholder.svg?height=185&width=185"}" 
                      alt="${actor.name}" 
                      class="w-24 h-24 object-cover"
                      onerror="this.onerror=null; this.src='/placeholder.svg?height=185&width=185';"
                    >
                    <div class="p-2 text-center">
                      <p class="text-xs font-medium truncate">${actor.name}</p>
                      <p class="text-xs text-gray-400 truncate">${actor.character || ""}</p>
                    </div>
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>

      <div id="watch-providers"></div>

      <div id="related-content"></div>

      ${
        type !== "filme"
          ? `
        <div class="mt-12" id="seasons-section">
          <h2 class="text-2xl font-semibold mb-4">Temporadas</h2>
          <select id="season-select" class="bg-gray-800 text-white px-4 py-2 rounded mb-4"></select>
          <div id="episodes-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"></div>
        </div>
      `
          : ""
      }
    </div>
  </div>
`

  if (overview) {
    const sinopseElement = document.getElementById("sinopse")
    createReadMore(sinopseElement, overview)
  }

  displayWatchProviders()
}

function displayRelatedContent(relatedContent) {
  if (!relatedContent || relatedContent.length === 0) {
    return
  }

  const relatedContainer = document.getElementById("related-content")
  if (!relatedContainer) return

  // Limitar a apenas 5 itens relacionados
  const itemsToShow = relatedContent.slice(0, 5)

  relatedContainer.innerHTML = `
  <div class="mt-12">
    <h2 class="text-2xl sm:text-3xl font-semibold mb-6">Conteúdo Relacionado</h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      ${itemsToShow
        .map(
          (item) => `
        <div class="cursor-pointer relative overflow-hidden rounded-lg aspect-[2/3]" 
             onclick="window.location.href='detalhes.html?id=${item.id}&type=${item.media_type === "movie" ? "filme" : "serie"}'">
          <img 
            src="${
              item.poster_path
                ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
                : "/placeholder.svg?height=513&width=342"
            }" 
            alt="${item.title || item.name}" 
            class="w-full h-full object-cover transition-transform hover:scale-110"
            onerror="this.onerror=null; this.src='/placeholder.svg?height=513&width=342';"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
          
          <div class="absolute bottom-0 left-0 right-0 p-3">
            <h3 class="text-white font-bold text-sm sm:text-base mb-1">${item.title || item.name}</h3>
            <div class="flex justify-between items-center">
              <span class="text-gray-300 text-xs">${(item.release_date || item.first_air_date || "").split("-")[0]}</span>
              <div class="flex items-center">
                <svg class="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                <span class="text-yellow-400 text-xs font-bold">${Math.round((item.vote_average || 0) * 10)}%</span>
              </div>
            </div>
            <div class="mt-1">
              <span class="block h-1 w-1 rounded-full bg-purple-600"></span>
            </div>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>
`
}

function displayWatchProviders() {
  const { currentContent } = state
  if (!currentContent || !currentContent["watch/providers"] || !currentContent["watch/providers"].results) return

  const providers = currentContent["watch/providers"].results.BR
  if (!providers) {
    document.getElementById("watch-providers").innerHTML = `
    <div class="mt-8 sm:mt-12">
      <h3 class="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Em qual Streaming tem?</h3>
      <p class="text-gray-400">Não disponível nas plataformas de streaming no Brasil.</p>
    </div>
  `
    return
  }

  const allProviders = [
    ...new Set([...(providers.flatrate || []), ...(providers.rent || []), ...(providers.buy || [])]),
  ]

  if (allProviders.length === 0) {
    document.getElementById("watch-providers").innerHTML = `
    <div class="mt-8 sm:mt-12">
      <h3 class="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Q</h3>
      <p class="text-gray-400">Não disponível nas plataformas de streaming no Brasil.</p>
    </div>
  `
    return
  }

  const uniqueProviders = allProviders.filter(
    (provider, index, self) => index === self.findIndex((t) => t.provider_id === provider.provider_id),
  )

  document.getElementById("watch-providers").innerHTML = `
  <div class="mt-8 sm:mt-12">
    <h3 class="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Em qual Streaming tem?</h3>
    <div class="flex flex-wrap gap-4">
      ${uniqueProviders
        .map(
          (provider) => `
        <div class="provider-logo">
          <div class="bg-gray-800 rounded-lg p-2 flex items-center justify-center">
            <img src="https://image.tmdb.org/t/p/original${provider.logo_path}" 
                 alt="${provider.provider_name}" 
                 class="w-12 h-12 object-contain"
                 title="${provider.provider_name}"
                 onerror="this.onerror=null; this.src='/placeholder.svg?height=48&width=48';">
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>
`
}

async function fetchSeasons(id) {
  try {
    const response = await fetch(`${baseURL}tv/${id}?api_key=${movieApiKey}&language=pt-BR`)
    if (!response.ok) throw new Error("Falha na requisição de temporadas")
    const data = await response.json()
    displaySeasons(data.seasons)
  } catch (error) {
    console.error("Erro ao buscar temporadas:", error)
  }
}

function displaySeasons(seasons) {
  const seasonSelect = document.getElementById("season-select")
  if (!seasonSelect) return

  seasonSelect.innerHTML = seasons
    .filter((season) => season.season_number > 0)
    .map((season) => `<option value="${season.season_number}">Temporada ${season.season_number}</option>`)
    .join("")

  seasonSelect.addEventListener("change", (e) => fetchEpisodes(state.currentContent.id, e.target.value))

  if (seasons.length > 0) {
    const firstSeason = seasons.find((season) => season.season_number > 0)
    if (firstSeason) {
      fetchEpisodes(state.currentContent.id, firstSeason.season_number)
    }
  }
}

async function fetchEpisodes(seriesId, seasonNumber) {
  try {
    const response = await fetch(
      `${baseURL}tv/${seriesId}/season/${seasonNumber}?api_key=${movieApiKey}&language=pt-BR`,
    )
    if (!response.ok) throw new Error("Falha na requisição de episódios")
    const data = await response.json()
    displayEpisodes(data.episodes, seasonNumber)
  } catch (error) {
    console.error("Erro ao buscar episódios:", error)
  }
}

function displayEpisodes(episodes, seasonNumber) {
  const episodesList = document.getElementById("episodes-list")
  if (!episodesList) return

  const totalEpisodes = episodes.length
  episodesList.innerHTML = episodes
    .map(
      (episode, index) => `
  <div class="bg-gray-800 rounded-lg overflow-hidden flex flex-col">
    <img src="${
      episode.still_path
        ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
        : "/placeholder.svg?height=169&width=300"
    }" 
         alt="${episode.name}" 
         class="w-full h-40 object-cover">
    <div class="p-4 flex-grow flex flex-col justify-between">
      <div>
        <h4 class="font-semibold">${episode.name}</h4>
        <p class="text-sm text-gray-400">Episódio ${episode.episode_number}/${totalEpisodes}</p>
      </div>
      <button onclick="watchContent('${state.currentContent.id}', '${state.currentContent.type}', ${seasonNumber}, ${episode.episode_number}, ${totalEpisodes}, true)" 
              class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors w-full">
        Assistir
      </button>
    </div>
  </div>
`,
    )
    .join("")
}

function watchContent(
  id = null,
  type = null,
  seasonNumber = null,
  episodeNumber = null,
  totalEpisodes = null,
  autoPlay = false,
) {
  const contentId = id || state.currentContent.id
  const contentType = type || state.currentContent.type

  // Exibir modal de seleção de servidores
  showServerSelectionModal(contentId, contentType, seasonNumber, episodeNumber, totalEpisodes, autoPlay)
}

// Modificar a função showServerSelectionModal para adicionar mais servidores
function showServerSelectionModal(contentId, contentType, seasonNumber, episodeNumber, totalEpisodes, autoPlay) {
  // Remover modal existente se houver
  const existingModal = document.getElementById("server-modal")
  if (existingModal) {
    existingModal.remove()
  }

  // Criar o modal
  const modal = document.createElement("div")
  modal.id = "server-modal"
  modal.className = "fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"

  // Título do conteúdo
  const contentTitle = state.currentContent.title || state.currentContent.name
  const episodeInfo = seasonNumber && episodeNumber ? ` - Temporada ${seasonNumber}, Episódio ${episodeNumber}` : ""

  // Definir servidores disponíveis - Removendo VidSrc
  const servers = [
    {
      name: "Superflix",
      id: "superflix",
      url: getServerUrl(contentId, contentType, seasonNumber, episodeNumber, "superflix", autoPlay),
    },
    {
      name: "WarezCDN",
      id: "warezcdn",
      url: getServerUrl(contentId, contentType, seasonNumber, episodeNumber, "warezcdn", autoPlay),
    },
  ]

  // Conteúdo do modal
  modal.innerHTML = `
  <div class="bg-dark-800 rounded-lg max-w-md w-full mx-auto overflow-hidden shadow-xl">
    <div class="p-5 border-b border-gray-700">
      <div class="flex justify-between items-center">
        <h3 class="text-xl font-semibold text-white">${contentTitle}${episodeInfo}</h3>
        <button id="close-modal" class="text-gray-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="p-5">
      <p class="text-gray-300 mb-4">Selecione um servidor para assistir:</p>
      <div class="space-y-3">
        ${servers
          .map(
            (server) => `
          <button 
            data-server="${server.id}" 
            data-url="${server.url}"
            class="server-btn w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex justify-between items-center transition-colors">
            <span>${server.name}</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </button>
        `,
          )
          .join("")}
      </div>
    </div>
    
    <div class="p-5 bg-gray-800">
      <p class="text-xs text-gray-400">Se um servidor não funcionar, tente outro. Alguns servidores podem ter restrições regionais ou estar temporariamente indisponíveis.</p>
    </div>
  </div>
`

  // Adicionar o modal ao body
  document.body.appendChild(modal)

  // Adicionar event listeners
  document.getElementById("close-modal").addEventListener("click", () => {
    modal.remove()
  })

  // Fechar ao clicar fora do modal
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })

  // Adicionar event listeners aos botões de servidor
  const serverButtons = document.querySelectorAll(".server-btn")
  serverButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.getAttribute("data-url")
      loadPlayer(url)
      modal.remove()
    })
  })
}

// Adicionar uma variável global para os mapeamentos de tipo de conteúdo
const contentTypeMap = {
  filme: {
    superflix: "filme",
    warezcdn: "filme",
    vidsrc: "movie",
  },
  serie: {
    superflix: "serie",
    warezcdn: "serie",
    vidsrc: "tv",
  },
  anime: {
    superflix: "animes",
    warezcdn: "animes",
    vidsrc: "tv",
  },
  dorama: {
    superflix: "doramas",
    warezcdn: "doramas",
    vidsrc: "tv",
  },
  novela: {
    superflix: "series", // novelas = /series no superflix
    warezcdn: "novelas",
    vidsrc: "tv",
  },
}

// Modificar a função getServerUrl para o VidSrc, adicionando endpoints alternativos
function getServerUrl(contentId, contentType, seasonNumber, episodeNumber, serverId, autoPlay) {
  let baseUrl = ""

  // Mapear o tipo de conteúdo para o formato correto de cada servidor
  const contentTypeMap = {
    filme: {
      superflix: "filme",
      warezcdn: "filme",
    },
    serie: {
      superflix: "serie",
      warezcdn: "serie",
    },
    anime: {
      superflix: "animes",
      warezcdn: "animes",
    },
    dorama: {
      superflix: "doramas",
      warezcdn: "doramas",
    },
    novela: {
      superflix: "series", // novelas = /series no superflix
      warezcdn: "novelas",
    },
  }

  // Determinar a URL base com base no servidor e tipo de conteúdo
  if (serverId === "superflix") {
    const mappedType = contentTypeMap[contentType]?.superflix || contentType
    baseUrl = `https://superflixapi.cx/${mappedType}/${contentId}`

    // Adicionar temporada e episódio se aplicável
    if (seasonNumber && episodeNumber && contentType !== "filme") {
      baseUrl += `/${seasonNumber}/${episodeNumber}`
    }
  } else if (serverId === "warezcdn") {
    const mappedType = contentTypeMap[contentType]?.warezcdn || contentType
    baseUrl = `https://embed.warezcdn.net/${mappedType}/${contentId}`

    // Adicionar temporada e episódio se aplicável
    if (seasonNumber && episodeNumber && contentType !== "filme") {
      baseUrl += `/${seasonNumber}/${episodeNumber}`
    }
  }

  // Adicionar parâmetros de autoplay se necessário
  if (autoPlay) {
    if (baseUrl.includes("?")) {
      baseUrl += "&autoplay=true"
    } else {
      baseUrl += "?autoplay=true"
    }

    // Adicionar informações do próximo episódio se disponível
    const nextEpisodeData = getNextEpisodeData(seasonNumber, episodeNumber, getTotalEpisodesForCurrentSeason())
    if (nextEpisodeData && contentType !== "filme") {
      baseUrl += `&next_season=${nextEpisodeData.nextSeason}&next_episode=${nextEpisodeData.nextEpisode}`
    }
  }

  // Adicionar timestamp para evitar cache
  baseUrl += (baseUrl.includes("?") ? "&" : "?") + "t=" + new Date().getTime()

  return baseUrl
}

// Modificar a função loadPlayer para melhor tratamento de erros
function loadPlayer(url) {
  console.log("Carregando player com URL:", url)

  // Extrair o servidor da URL
  const serverId = url.includes("superflixapi.cx")
    ? "superflix"
    : url.includes("warezcdn.net")
      ? "warezcdn"
      : "desconhecido"

  const playerContainer = createPlayerContainer()
  playerContainer.innerHTML = `
  <div class="relative w-full h-full">
    <div class="loading-spinner"></div>
    <iframe 
      id="player-iframe"
      src="${url}"
      class="w-full h-full"
      frameborder="0" 
      allowfullscreen
      allow="autoplay; fullscreen"
      sandbox="allow-scripts allow-same-origin allow-forms"
      referrerpolicy="no-referrer"
    ></iframe>
    <div class="server-badge">${serverId.toUpperCase()}</div>
    <button id="close-player" class="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  </div>
`

  // Adicionar event listener para o botão de fechar
  document.getElementById("close-player").addEventListener("click", closePlayer)

  // Verificar se o player está carregando corretamente
  const iframe = document.getElementById("player-iframe")
  if (iframe) {
    // Remover spinner quando o iframe carregar
    iframe.onload = () => {
      const spinner = playerContainer.querySelector(".loading-spinner")
      if (spinner) spinner.remove()
    }

    // Verificar se o player carregou corretamente
    checkPlayerLoading(iframe, serverId)

    // Monitorar mensagens do iframe
    window.addEventListener("message", (event) => {
      // Verificar se a mensagem é de um dos nossos servidores confiáveis
      const trustedOrigins = ["superflixapi.cx", "embed.warezcdn.net"]
      const isFromTrustedOrigin = trustedOrigins.some((origin) => event.origin.includes(origin))

      if (!isFromTrustedOrigin) {
        console.warn("Mensagem bloqueada de origem não confiável:", event.origin)
        return
      }

      // Processar mensagens confiáveis aqui
      console.log("Mensagem recebida de origem confiável:", event.data)

      // Verificar se a mensagem indica erro
      if (
        event.data &&
        typeof event.data === "string" &&
        (event.data.includes("unavailable") || event.data.includes("error"))
      ) {
        showErrorNotification("Erro no servidor: " + event.data)
      }
    })
  }
}

// Modificar a função checkPlayerLoading para ajustar o fallback sem VidSrc
function checkPlayerLoading(iframe, serverId) {
  // Adicionar um timeout para verificar se o player carregou
  setTimeout(() => {
    try {
      // Verificar se o iframe está acessível
      if (!iframe.contentWindow) {
        console.warn(`Player do servidor ${serverId} não está acessível. Possível erro de CORS.`)
        showErrorNotification(`Servidor ${serverId} não está respondendo. Tente outro servidor.`)
        return
      }

      // Tentar acessar o conteúdo do iframe (isso pode falhar devido a CORS)
      try {
        const iframeContent = iframe.contentWindow.document.body.innerHTML

        // Verificar se há mensagens de erro no conteúdo
        if (
          iframeContent.includes("unavailable") ||
          iframeContent.includes("not found") ||
          iframeContent.includes("error")
        ) {
          console.warn(`Conteúdo indisponível no servidor ${serverId}.`)
          showErrorNotification(`Mídia indisponível no servidor ${serverId}. Tente outro servidor.`)

          // Tentar outro servidor automaticamente
          const fallbackServerId = serverId === "superflix" ? "warezcdn" : "superflix"

          // Obter URL do servidor alternativo
          const contentId = state.currentContent.id
          const contentType = state.currentContent.type
          const seasonNumber = state.currentSeason
          const episodeNumber = state.currentEpisode

          const fallbackUrl = getServerUrl(contentId, contentType, seasonNumber, episodeNumber, fallbackServerId, false)

          // Carregar o servidor alternativo
          iframe.src = fallbackUrl

          // Atualizar o badge do servidor
          const serverBadge = document.querySelector(".server-badge")
          if (serverBadge) {
            serverBadge.textContent = fallbackServerId.toUpperCase()
          }

          // Mostrar mensagem para o usuário
          showErrorNotification(`Tentando servidor ${fallbackServerId.toUpperCase()} automaticamente...`)
        }
      } catch (corsError) {
        // Erro de CORS é esperado e não indica necessariamente um problema
        console.log("Não foi possível verificar o conteúdo do iframe devido a restrições de CORS.")
      }
    } catch (e) {
      console.log("Erro ao verificar carregamento do player:", e)
    }
  }, 5000)
}
// Atualizar a lista de domínios confiáveis no bloqueador de pop-ups
;(() => {
  // Bloqueia a abertura de novas janelas (pop-ups)
  const originalWindowOpen = window.open
  window.open = (url, target, features) => {
    // Permitir apenas URLs de domínios confiáveis
    const trustedDomains = ["superflixapi.cx", "warezcdn.net", "youtube.com", "youtu.be"]
    const isTrusted = url && trustedDomains.some((domain) => url.includes(domain))

    if (isTrusted) {
      console.log("Abrindo URL confiável:", url)
      return originalWindowOpen.call(window, url, target, features)
    } else {
      console.warn("Pop-up bloqueado:", url)
      return null
    }
  }

  // Monitora cliques em links para evitar redirecionamentos indesejados
  document.addEventListener("click", (event) => {
    const target = event.target.closest("a")
    if (target && target.target === "_blank") {
      // Verificar se é um link confiável
      const trustedDomains = ["superflixapi.cx", "warezcdn.net", "youtube.com", "youtu.be"]
      const isTrusted = trustedDomains.some((domain) => target.href.includes(domain))

      if (!isTrusted) {
        event.preventDefault()
        console.warn("Abertura de nova aba bloqueada:", target.href)
      }
    }
  })
})()

function showErrorNotification(message) {
  // Cria o elemento de notificação
  const notification = document.createElement("div")
  notification.className = "fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50"
  notification.textContent = message

  // Adiciona ao body
  document.body.appendChild(notification)

  // Remove após alguns segundos
  setTimeout(() => {
    notification.remove()
  }, 5000)
}
