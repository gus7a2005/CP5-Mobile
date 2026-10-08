import * as ImagePicker from 'expo-image-picker';

export class PermissionDeniedError extends Error {}

export async function pickImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new PermissionDeniedError('Permissão da galeria negada.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6,
  });
  return res.canceled ? null : res.assets[0].uri;
}

export async function uploadImage(uri: string): Promise<string> {
  const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error('Serviço de imagens não configurado.');
  const form = new FormData();
  form.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' } as unknown as Blob);
  form.append('upload_preset', preset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Falha ao enviar a imagem.');
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error('Resposta inválida do serviço de imagens.');
  return json.secure_url;   // só essa URL vai para o Firestore
}