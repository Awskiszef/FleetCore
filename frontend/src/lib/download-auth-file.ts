export async function downloadAuthenticatedFile(
    url: string,
    filename: string,
): Promise<void> {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Brak tokenu autoryzacyjnego.");
    }

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        let message = `Błąd pobierania pliku: HTTP ${response.status}`;

        try {
            const errorData = await response.json();

            if (errorData?.message) {
                message = Array.isArray(errorData.message)
                    ? errorData.message.join(", ")
                    : errorData.message;
            }
        } catch {
            // Odpowiedź nie była JSON-em.
        }

        throw new Error(message);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
    }, 1000);
}