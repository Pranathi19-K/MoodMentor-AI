export async function getGroqRecommendations(
  mood: string,
  limit: number = 5
) {
  const response = await fetch(
    `https://moodmentor-ai.onrender.com/groq/recommendations?mood=${encodeURIComponent(
      mood
    )}&limit=${limit}`
  );

  if (!response.ok) {
    throw new Error("Failed to get Groq recommendations");
  }

  return response.json();
}