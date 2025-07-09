// Sample data for movies and series
const movies = [
  {
    title: "Nosferatu",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20Tela%202025-02-08%20a%CC%80s%2023.25.09-8oicSMifhXCbVbynwJtz4frxRqs8wU.png",
  },
  {
    title: "Saturday Night",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20Tela%202025-02-08%20a%CC%80s%2023.25.09-8oicSMifhXCbVbynwJtz4frxRqs8wU.png",
  },
  // Add more movies as needed
]

const series = [
  {
    title: "Night Agent",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20Tela%202025-02-08%20a%CC%80s%2023.25.09-8oicSMifhXCbVbynwJtz4frxRqs8wU.png",
  },
  {
    title: "Severance",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Captura%20de%20Tela%202025-02-08%20a%CC%80s%2023.25.09-8oicSMifhXCbVbynwJtz4frxRqs8wU.png",
  },
  // Add more series as needed
]

// Function to create movie/series cards
function createCard(item) {
  return `
        <div class="movie-card">
            <img src="${item.image}" alt="${item.title}">
            <div class="title">${item.title}</div>
        </div>
    `
}

// Function to populate sections
function populateSection(sectionId, items) {
  const container = document.getElementById(sectionId)
  if (container) {
    container.innerHTML = items.map((item) => createCard(item)).join("")
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  populateSection("popular-movies", movies)
  populateSection("popular-series", series)
})

