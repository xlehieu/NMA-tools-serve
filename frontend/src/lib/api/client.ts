import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:3000'
});

export interface SubjectChoices {
  subjects: string[];
  choices: string[];
}

export interface ConvertResult {
  name: string;
  success: boolean;
  error?: string;
  downloadUrl?: string;
}

export async function getTeachingScheduleSubjects(file: File) {
  const form = new FormData();
  form.set('currentWeek', file);
  const { data } = await apiClient.post<SubjectChoices>(
    '/excel/teaching-schedule/subjects',
    form
  );
  return data;
}

export async function updateTeachingSchedule(input: {
  previousWeek: File;
  currentWeek: File;
  subjectMappings: Record<string, string>;
}) {
  const form = new FormData();
  form.set('previousWeek', input.previousWeek);
  form.set('currentWeek', input.currentWeek);
  form.set('subjectMappings', JSON.stringify(input.subjectMappings));
  try {
    const { data } = await apiClient.post<Blob>('/excel/teaching-schedule', form, {
      responseType: 'blob'
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError<Blob>(error) && error.response?.data instanceof Blob) {
      try {
        const body = JSON.parse(await error.response.data.text());
        throw new Error(body.message || 'Không cập nhật được lịch báo giảng.');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') {
          throw parseError;
        }
      }
    }
    throw error;
  }
}

export async function convertDocuments(input: { files: File[]; outputDir: string }) {
  const form = new FormData();
  input.files.forEach((file) => form.append('files', file));
  form.set('outputDir', input.outputDir);
  const { data } = await apiClient.post<{ items: ConvertResult[] }>(
    '/convert-doc-to-pdf',
    form
  );
  return data;
}

export async function copyProtectedPdf(input: { file: File; password: string }) {
  const form = new FormData();
  form.set('pdf', input.file);
  form.set('password', input.password);
  const { data } = await apiClient.post<{ downloadUrl: string }>(
    '/copy-protected-pdf',
    form
  );
  return data;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function getMonthlyMailColumns(excel: File) {
  const form = new FormData();
  form.set('excel', excel);
  const { data } = await apiClient.post<{ columns: string[]; count: number }>('/monthly-mail/columns', form);
  return data;
}

export async function generateMonthlyMail(input: {
  template: File;
  excel: File;
  nameField: string;
  zipName: string;
}) {
  const form = new FormData();
  form.set('template', input.template);
  form.set('excel', input.excel);
  form.set('nameField', input.nameField);
  form.set('zipName', input.zipName);
  try {
    const { data, headers } = await apiClient.post<Blob>('/monthly-mail', form, { responseType: 'blob' });
    const disposition = String(headers['content-disposition'] ?? '');
    const unicodeName = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    const filename = unicodeName ? decodeURIComponent(unicodeName) :
      /filename="([^"]+)"/i.exec(disposition)?.[1] ?? 'Thu-thang.zip';
    return { data, filename };
  } catch (error) {
    if (axios.isAxiosError<Blob>(error) && error.response?.data instanceof Blob) {
      const body = await error.response.data.text();
      let message: string | undefined;
      try {
        message = JSON.parse(body)?.message;
      } catch {
        // A non-JSON response uses the default error message.
      }
      if (typeof message === 'string') throw new Error(message);
    }
    throw error;
  }
}
