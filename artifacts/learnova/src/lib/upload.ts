import { getToken } from "@/lib/auth";

export async function uploadFormDataFile(
  endpoint: string,
  formData: FormData,
): Promise<any> {
  const token = getToken();
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    let error;
    try {
      const data = await response.json();
      error = data.error || data.message || response.statusText;
    } catch {
      error = response.statusText;
    }
    throw new Error(error || "Upload failed");
  }

  return response.json();
}
