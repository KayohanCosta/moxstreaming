const movieApiKey = "5768cb6af3cda69c23d9b4075c0aac34"
const fanartApiKey = "bd7e6181c8dfa6e5c94b9c540d4c93da"
const baseURL = "https://api.themoviedb.org/3/"

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search)
  const id = urlParams.get("id")
  const type = urlParams.get("type")

  if (id && type) {
    fetchDetails(id, type)
    // Verificar se há próximo episódio para reproduzir
    checkAndPlayNextEpisode()
  } else {
    console.error("ID ou tipo não fornecido na URL")
  }
  injectAdBlocker()
})

async function fetchDetails(id, type) {
  const apiKey = movieApiKey
  let endpoint

  if (type === "filme") {
    endpoint = `${baseURL}movie/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits,watch/providers`
  } else {
    endpoint = `${baseURL}tv/${id}?api_key=${apiKey}&language=pt-BR&append_to_response=credits,watch/providers`
  }

  try {
    // Buscar detalhes do TMDB
    const response = await fetch(endpoint)
    const data = await response.json()

    // Buscar logo do Fanart.tv
    const fanartResponse = await fetch(`http://webservice.fanart.tv/v3/movies/${id}?api_key=${fanartApiKey}`)
    const fanartData = await fanartResponse.json()

    // Extrair logo do Fanart.tv
    let logo = null
    let logoLanguage = null

    if (fanartData.hdmovielogo && fanartData.hdmovielogo.length > 0) {
      const ptLogo = fanartData.hdmovielogo.find((l) => l.lang === "pt")
      if (ptLogo) {
        logo = ptLogo.url
        logoLanguage = "pt-BR"
      } else {
        logo = fanartData.hdmovielogo[0].url
        logoLanguage = fanartData.hdmovielogo[0].lang
      }
    } else if (fanartData.hdtvlogo && fanartData.hdtvlogo.length > 0) {
      const ptLogo = fanartData.hdtvlogo.find((l) => l.lang === "pt")
      if (ptLogo) {
        logo = ptLogo.url
        logoLanguage = "pt-BR"
      } else {
        logo = fanartData.hdtvlogo[0].url
        logoLanguage = fanartData.hdtvlogo[0].lang
      }
    }

    // Adicionar logo e informação de idioma aos dados
    data.fanartLogo = logo
    data.logoLanguage = logoLanguage

    displayDetails(data, type)

    if (type !== "filme") {
      fetchSeasons(id)
    }
  } catch (error) {
    console.error("Erro ao buscar detalhes:", error)
  }
}

function displayDetails(data, type) {
  const contentDetails = document.getElementById("detalhes-container")
  const backdropPath = `https://image.tmdb.org/t/p/original${data.backdrop_path}`
  const title = data.title || data.name
  const releaseYear = (data.release_date || data.first_air_date || "").split("-")[0]
  const runtime = data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0)
  const rating = data.vote_average.toFixed(1)
  const directors = data.credits.crew.filter((person) => person.job === "Director").map((director) => director.name)
  const cast = data.credits.cast.slice(0, 3)

  const watchProvidersHTML = displayWatchProviders(data["watch/providers"], data.id, type === "filme" ? "movie" : "tv")

  contentDetails.innerHTML = `
        <div class="relative min-h-screen">
            <div class="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10"></div>
            <img src="${backdropPath}" alt="" class="absolute inset-0 w-full h-full object-cover">
            
            <div class="relative z-20 container mx-auto px-4 py-20">
                ${
                  data.fanartLogo
                    ? `
                    <div class="max-w-md mb-4">
                        <img 
                            src="${data.fanartLogo}" 
                            alt="${title}" 
                            class="w-full h-auto object-contain"
                            style="filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));"
                        >
                        ${
                          data.logoLanguage !== "pt-BR"
                            ? `<p class="text-sm text-gray-400 mt-2">Logo disponível apenas em ${data.logoLanguage.toUpperCase()}</p>`
                            : ""
                        }
                    </div>
                    `
                    : `<h1 class="text-4xl md:text-6xl font-serif mb-4">${title}</h1>`
                }
                
                <div class="flex flex-wrap items-center gap-4 text-sm mb-6">
                    ${runtime ? `<span>${runtime} min</span>` : ""}
                    <span>${releaseYear}</span>
                    <div class="flex items-center bg-yellow-500 px-2 rounded">
                        <span class="font-bold">${Math.round(data.vote_average * 10)}%</span>
                    </div>
                </div>

                <div class="space-y-6 max-w-2xl mb-8">
                    ${
                      data.genres && data.genres.length
                        ? `
                        <div>
                            <h3 class="text-gray-400 uppercase text-sm mb-2">GÊNEROS</h3>
                            <div class="flex flex-wrap gap-2">
                                ${data.genres
                                  .map(
                                    (genre) =>
                                      `<span class="px-3 py-1 bg-gray-800 rounded-full text-sm">${genre.name}</span>`,
                                  )
                                  .join("")}
                            </div>
                        </div>
                    `
                        : ""
                    }

                    ${
                      cast.length > 0
                        ? `
                        <div>
                            <h3 class="text-gray-400 uppercase text-sm mb-2">ELENCO</h3>
                            <div class="text-sm">
                                ${cast.map((actor) => actor.name).join(", ")}
                            </div>
                        </div>
                    `
                        : ""
                    }

                    ${
                      directors.length > 0
                        ? `
                        <div>
                            <h3 class="text-gray-400 uppercase text-sm mb-2">DIRETOR</h3>
                            <div class="text-sm">
                                ${directors.join(", ")}
                            </div>
                        </div>
                    `
                        : ""
                    }

                    ${
                      data.overview
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
                            <button onclick="watchContent('${data.id}', '${type}')" 
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
                        <button onclick="openTrailer('${data.id}', ${type === "filme"})" 
                                class="flex items-center gap-2 px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                            </svg>
                            <span>Trailer</span>
                        </button>
                    </div>
                </div>

                ${watchProvidersHTML}

                ${
                  type !== "filme"
                    ? `
                    <div class="mt-12" id="seasons-section">
                        <h2 class="text-2xl font-semibold mb-4">Temporadas</h2>
                        <select id="season-select" class="bg-gray-800 text-white px-4 py-2 rounded mb-4">
                            <!-- Opções de temporadas serão adicionadas aqui -->
                        </select>
                        <div id="episodes-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <!-- Lista de episódios será adicionada aqui -->
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        </div>
    `

  if (data.overview) {
    const sinopseElement = document.getElementById("sinopse")
    createReadMore(sinopseElement, data.overview)
  }

  if (type !== "filme") {
    fetchSeasons(data.id)
  }
}

function displayWatchProviders(watchProviders, contentId, contentType) {
  console.log("Watch Providers:", watchProviders)

  if (!watchProviders || !watchProviders.results || !watchProviders.results.BR) {
    console.log("Nenhum provedor disponível para o Brasil")
    return `
      <div class="mt-8 sm:mt-12">
        <h3 class="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Onde assistir</h3>
        <p class="text-gray-400">Não disponível nas plataformas de streaming no Brasil.</p>
      </div>
    `
  }

  const { flatrate = [], rent = [], buy = [] } = watchProviders.results.BR
  const allProviders = [...new Set([...flatrate, ...rent, ...buy])]

  if (allProviders.length === 0) {
    console.log("Nenhum provedor disponível")
    return `
      <div class="mt-8 sm:mt-12">
        <h3 class="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Onde assistir</h3>
        <p class="text-gray-400">Não disponível nas plataformas de streaming no Brasil.</p>
      </div>
    `
  }

  console.log("Provedores encontrados:", allProviders)

  return `
    <div class="mt-8 sm:mt-12">
      <h3 class="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Onde assistir</h3>
      <div class="flex flex-wrap gap-4">
        ${[...new Set(allProviders.map((provider) => provider.provider_name))]
          .map((providerName) => {
            const provider = allProviders.find((p) => p.provider_name === providerName)
            return `
            <div class="provider-logo">
              <div class="bg-gray-800 rounded-lg p-2 flex items-center justify-center">
                <img src="https://image.tmdb.org/t/p/original${provider.logo_path}" 
                     alt="${provider.provider_name}" 
                     class="w-12 h-12 object-contain"
                     title="${provider.provider_name}"
                     onerror="this.onerror=null; this.src='/placeholder.svg?height=48&width=48';">
              </div>
            </div>
          `
          })
          .join("")}
      </div>
    </div>
  `
}

async function fetchSeasons(id) {
  try {
    const response = await fetch(`${baseURL}tv/${id}?api_key=${movieApiKey}&language=pt-BR`)
    const data = await response.json()
    displaySeasons(data.seasons, id)
  } catch (error) {
    console.error("Erro ao buscar temporadas:", error)
  }
}

function displaySeasons(seasons, seriesId) {
  const seasonSelect = document.getElementById("season-select")
  seasonSelect.innerHTML = seasons
    .filter((season) => season.season_number > 0)
    .map((season) => `<option value="${season.season_number}">Temporada ${season.season_number}</option>`)
    .join("")

  seasonSelect.addEventListener("change", (e) => {
    fetchEpisodes(seriesId, e.target.value)
  })

  // Carregar episódios da primeira temporada por padrão
  if (seasons.length > 0) {
    const firstSeason = seasons.find((season) => season.season_number > 0)
    if (firstSeason) {
      fetchEpisodes(seriesId, firstSeason.season_number)
    }
  }
}

async function fetchEpisodes(seriesId, seasonNumber) {
  try {
    const response = await fetch(
      `${baseURL}tv/${seriesId}/season/${seasonNumber}?api_key=${movieApiKey}&language=pt-BR`,
    )
    const data = await response.json()
    displayEpisodes(data.episodes, seriesId, seasonNumber)
  } catch (error) {
    console.error("Erro ao buscar episódios:", error)
  }
}

function displayEpisodes(episodes, seriesId, seasonNumber) {
  const episodesList = document.getElementById("episodes-list")
  const totalEpisodes = episodes.length
  episodesList.innerHTML = episodes
    .map(
      (episode, index) => `
            <div class="bg-gray-800 rounded-lg overflow-hidden flex flex-col">
                <img src="https://image.tmdb.org/t/p/w300${episode.still_path}" 
                     alt="${episode.name}" 
                     class="w-full h-40 object-cover">
                <div class="p-4 flex-grow flex flex-col justify-between">
                    <div>
                        <h4 class="font-semibold">${episode.name}</h4>
                        <p class="text-sm text-gray-400">Episódio ${episode.episode_number}/${totalEpisodes}</p>
                    </div>
                    <button onclick="watchContent('${seriesId}', 'serie', ${seasonNumber}, ${episode.episode_number}, ${totalEpisodes}, true)" 
                            class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors w-full">
                        Assistir
                    </button>
                </div>
            </div>
        `,
    )
    .join("")
}

function watchContent(id, type, seasonNumber = null, episodeNumber = null, totalEpisodes = null, autoPlay = false) {
  let url

  if (type === "filme") {
    url = `https://embed.warezcdn.net/filme/${id}`
  } else {
    url = `https://embed.warezcdn.net/serie/${id}`
    if (seasonNumber && episodeNumber) {
      url += `/${seasonNumber}/${episodeNumber}`
    }
  }

  // Armazenar informações do episódio atual no localStorage
  if (type === "serie" && seasonNumber && episodeNumber) {
    localStorage.setItem(
      "currentSeries",
      JSON.stringify({
        id,
        seasonNumber,
        episodeNumber,
        totalEpisodes,
      }),
    )
  }

  // Adicionar parâmetros para autoplay e próximo episódio
  if (autoPlay) {
    const nextEpisodeData = getNextEpisodeData(seasonNumber, episodeNumber, totalEpisodes)
    if (nextEpisodeData) {
      url += `?autoplay=true&next_season=${nextEpisodeData.nextSeason}&next_episode=${nextEpisodeData.nextEpisode}`
    } else {
      url += "?autoplay=true"
    }
  }

  // Adicionar timestamp para evitar cache
  url += (url.includes("?") ? "&" : "?") + "t=" + new Date().getTime()

  console.log("Navigating to URL:", url)

  const playerContainer = createPlayerContainer()

  // Criar iframe com sandbox para segurança
  playerContainer.innerHTML = `
    <div class="relative w-full h-full">
      <iframe 
        src="${url}"
        class="w-full h-full"
        frameborder="0" 
        allowfullscreen
        sandbox="allow-scripts allow-same-origin allow-forms"
      ></iframe>
      <button onclick="closePlayer()" class="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors">
        Fechar
      </button>
    </div>
  `
}

function createPlayerContainer() {
  let container = document.getElementById("player-container")
  if (!container) {
    container = document.createElement("div")
    container.id = "player-container"
    container.className = "fixed inset-0 bg-black z-50"
    document.body.appendChild(container)
  }
  return container
}

function closePlayer() {
  const playerContainer = document.getElementById("player-container")
  if (playerContainer) {
    playerContainer.remove()
  }
}

function checkAndPlayNextEpisode() {
  const urlParams = new URLSearchParams(window.location.search)
  const nextSeason = urlParams.get("next_season")
  const nextEpisode = urlParams.get("next_episode")

  console.log("Checking for next episode:", nextSeason, nextEpisode)

  if (nextSeason && nextEpisode) {
    const currentSeries = JSON.parse(localStorage.getItem("currentSeries"))
    if (currentSeries) {
      console.log("Current series data:", currentSeries)
      // Aguardar um pequeno intervalo antes de reproduzir o próximo episódio
      setTimeout(() => {
        createPlayerContainer() // Cria o container do player se não existir
        watchContent(
          currentSeries.id,
          "serie",
          Number(nextSeason),
          Number(nextEpisode),
          currentSeries.totalEpisodes,
          true,
        )
      }, 1000) // 1 segundo de delay
    }
  }
}

async function openTrailer(mediaId, isMovie) {
  try {
    const response = await fetch(
      `${baseURL}${isMovie ? "movie" : "tv"}/${mediaId}/videos?api_key=${movieApiKey}&language=pt-BR`,
    )
    const data = await response.json()

    const trailer = data.results.find((video) => video.type === "Trailer") || data.results[0]

    if (trailer) {
      window.open(`https://www.youtube.com/watch?v=${trailer.key}`, "_blank")
    } else {
      alert("Trailer não disponível")
    }
  } catch (error) {
    console.error("Erro ao buscar trailer:", error)
    alert("Erro ao carregar o trailer")
  }
}

function createReadMore(element, fullText, maxLength = 150) {
  if (fullText.length <= maxLength) {
    element.textContent = fullText
    return
  }

  const truncatedText = fullText.substring(0, maxLength) + "... "
  const readMoreBtn = document.createElement("button")
  readMoreBtn.className = "text-indigo-400 hover:text-indigo-300 text-sm font-medium"
  readMoreBtn.textContent = "Ler mais"

  let isExpanded = false
  readMoreBtn.onclick = () => {
    isExpanded = !isExpanded
    element.textContent = isExpanded ? fullText : truncatedText
    readMoreBtn.textContent = isExpanded ? "Ler menos" : "Ler mais"
    element.appendChild(readMoreBtn)
  }

  element.textContent = truncatedText
  element.appendChild(readMoreBtn)
}

function getNextEpisodeData(seasonNumber, episodeNumber, totalEpisodes) {
  if (episodeNumber < totalEpisodes) {
    return { nextSeason: seasonNumber, nextEpisode: episodeNumber + 1 }
  } else if (seasonNumber < 100) {
    // Assuming a maximum of 100 seasons, adjust as needed
    return { nextSeason: seasonNumber + 1, nextEpisode: 1 }
  } else {
    return null
  }
}

function injectAdBlocker() {
  const script = document.createElement("script")
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/adblock-detect/1.0.5/adblock-detect.min.js"
  script.onload = () => {
    if (typeof adblockDetect === "function") {
      adblockDetect.init({
        debug: true,
        found: () => {
          console.log("AdBlock está ativado")
        },
        notFound: () => {
          console.log("AdBlock não está ativado. Ativando bloqueador de anúncios interno.")
          // Aqui você pode adicionar lógica adicional para bloquear anúncios
        },
      })
    }
  }
  document.head.appendChild(script)
}

