<script lang="ts">
  import { createMutation } from '@tanstack/svelte-query';
  import { generateMonthlyMail, getApiErrorMessage, getMonthlyMailColumns } from '../../lib/api/client';

  let excel: File | undefined = $state();
  const columnsMutation = createMutation({ mutationFn: getMonthlyMailColumns });
  const generateMutation = createMutation({ mutationFn: generateMonthlyMail });
  const columns = $derived($columnsMutation.data?.columns ?? []);
  const defaultColumn = $derived(columns.find((name) =>
    name.normalize('NFC').toLocaleLowerCase('vi') === 'họ và tên học sinh'
  ) ?? columns[0]);

  function selectExcel(file: File | undefined) {
    excel = file;
    $columnsMutation.reset();
    $generateMutation.reset();
    if (file) $columnsMutation.mutate(file);
  }

  async function submit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const template = form.get('template');
    const nameField = form.get('nameField');
    if (!excel || !(template instanceof File) || !template.size || typeof nameField !== 'string') return;

    try {
      const result = await $generateMutation.mutateAsync({
        template, excel, nameField, zipName: String(form.get('zipName') ?? '')
      });
      const url = URL.createObjectURL(result.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      // The mutation error is shown below the heading.
    }
  }
</script>

<h1 class="mb-2 text-3xl font-bold tracking-tight md:text-4xl">Tạo thư tháng</h1>
<p class="mb-7 leading-6 text-base-content/65">
  Trộn mẫu Word với danh sách Excel, xuất một PDF cho mỗi dòng và tải tất cả trong một tệp ZIP.
</p>

{#if $columnsMutation.isError || $generateMutation.isError}
  <div class="alert alert-error alert-soft mb-5" role="alert">
    {getApiErrorMessage($columnsMutation.error ?? $generateMutation.error, 'Không thể xử lý thư tháng.')}
  </div>
{/if}

<form onsubmit={submit}>
  <fieldset class="grid min-w-0 gap-5" disabled={$generateMutation.isPending}>
    <div class="grid gap-5 sm:grid-cols-2">
      <label class="grid gap-2 text-sm font-semibold">
        Mẫu Word (.docx)
        <input class="file-input" type="file" name="template" accept=".docx" required
          onchange={() => $generateMutation.reset()} />
      </label>
      <label class="grid gap-2 text-sm font-semibold">
        Danh sách Excel (.xlsx)
        <input class="file-input" type="file" accept=".xlsx" required
          onchange={(event) => selectExcel(event.currentTarget.files?.[0])} />
      </label>
    </div>
    <p class="text-sm text-base-content/65">Dùng trang tính đầu tiên, dòng đầu là tiêu đề cột. Tối đa 250 dòng dữ liệu.</p>
    {#if $columnsMutation.isPending}
      <p class="flex items-center gap-2 text-sm" role="status">
        <span class="loading loading-spinner loading-xs"></span> Đang đọc danh sách Excel…
      </p>
    {:else if $columnsMutation.data}
      <p class="text-sm text-base-content/65" role="status">Sẽ tạo {$columnsMutation.data.count} tệp PDF.</p>
      <label class="grid gap-2 text-sm font-semibold">
        Cột dùng để đặt tên PDF
        <select class="select" name="nameField" required>
          {#each columns as column (column)}
            <option value={column} selected={column === defaultColumn}>{column}</option>
          {/each}
        </select>
      </label>
    {/if}
    <label class="grid gap-2 text-sm font-semibold">
      Tên tệp ZIP
      <input class="input" name="zipName" maxlength="100" placeholder="Thu-thang" />
    </label>
    <button class="btn btn-primary btn-lg justify-self-start" disabled={!columns.length || $generateMutation.isPending}>
      {#if $generateMutation.isPending}
        <span class="loading loading-spinner loading-sm"></span> Đang tạo PDF…
      {:else}
        Tạo và tải ZIP
      {/if}
    </button>
  </fieldset>
</form>

{#if $generateMutation.isSuccess}
  <p class="alert alert-success alert-soft mt-5" role="status">Đã tạo {$generateMutation.data.filename}.</p>
{/if}
