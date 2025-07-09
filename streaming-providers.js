const movieApiKey = "5768cb6af3cda69c23d9b4075c0aac34"
const baseURL = "https://api.themoviedb.org/3/"

// Lista de provedores de streaming populares
const popularProviders = [
  { id: 8, name: "Netflix", color: "#E50914" },
  { id: 337, name: "Disney Plus", color: "#0063e5" },
  { id: 119, name: "Amazon Prime Video", color: "#00A8E1" },
  { id: 2, name: "Apple TV", color: "#000000" },
  { id: 384, name: "Max", color: "#5822b4" }, // Atualizado de HBO Max para Max
  { id: 531, name: "Paramount+", color: "#0064FF" },
  { id: 619, name: "Star+", color: "#ff870e" },
  { id: 307, name: "Globoplay", color: "#fb0234" },
  { id: 167, name: "Claro Video", color: "#ff0000" },
  { id: 350, name: "Apple TV Plus", color: "#000000" },
  { id: 100, name: "Crunchyroll", color: "#F47521" },
  { id: 283, name: "Crackle", color: "#FF3E3E" },
  { id: 386, name: "Telecine Play", color: "#00A651" },
  { id: 475, name: "DOCSVILLE", color: "#2F2F2F" },
  { id: 551, name: "Funimation", color: "#5A0CB5" },
  { id: 1773, name: "Discovery+", color: "#0099e5" }, // Novos provedores adicionados
  { id: 190, name: "Mubi", color: "#000000" },
  { id: 521, name: "HBO Go", color: "#5822b4" },
  { id: 97, name: "Looke", color: "#00b2a9" },
  { id: 159, name: "NOW", color: "#ff6600" },
  { id: 502, name: "YouTube Premium", color: "#FF0000" },
  { id: 55, name: "Hulu", color: "#1ce783" },
  { id: 15, name: "Rakuten TV", color: "#bf0000" },
  { id: 1796, name: "Netflix Kids", color: "#E50914" },
  { id: 232, name: "Zee5", color: "#6A0DAD" },
]

document.addEventListener("DOMContentLoaded", () => {
  loadStreamingProviders()
})

async function loadStreamingProviders() {
  try {
    // Obter a lista de provedores de streaming disponíveis
    const response = await fetch(
      `${baseURL}watch/providers/movie?api_key=${movieApiKey}&language=pt-BR&watch_region=BR`,
    )
    if (!response.ok) throw new Error("Falha ao carregar provedores de streaming")

    const data = await response.json()
    const providers = data.results

    // Filtrar e ordenar provedores
    const filteredProviders = filterAndSortProviders(providers)

    // Exibir os provedores
    displayProviders(filteredProviders)
  } catch (error) {
    console.error("Erro ao carregar provedores:", error)
    document.getElementById("streaming-providers-grid").innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-red-500 mb-2">Erro ao carregar provedores de streaming</p>
                <button onclick="loadStreamingProviders()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded">
                    Tentar novamente
                </button>
            </div>
        `
  }
}

function filterAndSortProviders(providers) {
  // Mapear os provedores populares com suas informações completas
  const mappedProviders = popularProviders
    .map((popularProvider) => {
      const provider = providers.find((p) => p.provider_id === popularProvider.id)
      if (provider) {
        return {
          ...provider,
          color: popularProvider.color,
        }
      }
      return null
    })
    .filter(Boolean) // Remover nulos

  return mappedProviders
}

function displayProviders(providers) {
  const grid = document.getElementById("streaming-providers-grid")

  if (providers.length === 0) {
    grid.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-gray-400">Nenhum provedor de streaming encontrado para sua região.</p>
            </div>
        `
    return
  }

  grid.innerHTML = providers
    .map(
      (provider) => `
        <a href="provider-content.html?id=${provider.provider_id}&name=${encodeURIComponent(provider.provider_name)}" 
           class="streaming-card bg-dark-800 rounded-lg overflow-hidden flex flex-col items-center p-4 hover:bg-dark-700 transition-colors"
           style="border-top: 4px solid ${provider.color}">
            <div class="provider-logo mb-4">
                <img src="https://image.tmdb.org/t/p/original${provider.logo_path}" 
                     alt="${provider.provider_name}" 
                     class="rounded-lg"
                     onerror="this.onerror=null; this.src='/placeholder.svg?height=120&width=120';">
            </div>
            <h3 class="text-lg font-semibold text-center">${provider.provider_name}</h3>
        </a>
    `,
    )
    .join("")
}

