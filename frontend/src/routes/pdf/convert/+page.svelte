<script lang="ts">
  import { createMutation } from '@tanstack/svelte-query';
  import { apiClient, convertDocuments, getApiErrorMessage } from '../../../lib/api/client';

  let files: File[] = $state([]);
  let outputDir = $state('');

  const convertMutation = createMutation({ mutationFn: convertDocuments });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!files.length) return;
    try {
      await $convertMutation.mutateAsync({ files, outputDir });
    } catch {
      // Lỗi được hiển thị trực tiếp từ mutation.
    }
  }
</script>
<h1 class="mb-2 text-3xl font-bold tracking-tight md:text-4xl">Chuyển DOCX sang PDF</h1>
<p class="mb-7 leading-6 text-base-content/65">Chọn tối đa 50 tệp Word để chuyển đổi.</p>

{#if $convertMutation.isError}
  <div class="alert alert-error alert-soft mb-5" role="alert">
    {getApiErrorMessage($convertMutation.error, 'Không chuyển đổi được file.')}
  </div>
{/if}

<form class="grid gap-5" onsubmit={submit}>
  <label class="grid gap-2 text-sm font-semibold">
    Tệp Word (.docx)
    <input
      class="file-input"
      type="file"
      accept=".docx"
      multiple
      required
      onchange={(event) => {
        files = Array.from(event.currentTarget.files ?? []);
        $convertMutation.reset();
      }}
    />
  </label>
  <label class="grid gap-2 text-sm font-semibold">
    Thư mục lưu trên máy chủ (tùy chọn)
    <input class="input" bind:value={outputDir} placeholder="Để trống để tải qua trình duyệt" />
  </label>
  <button class="btn btn-primary btn-lg justify-self-start" disabled={$convertMutation.isPending}>
    {$convertMutation.isPending ? 'Đang chuyển đổi…' : 'Chuyển sang PDF'}
  </button>
</form>

{#if $convertMutation.isSuccess}
  <section class="mt-8 border-t border-base-300 pt-6" aria-label="Kết quả chuyển đổi">
    <h2 class="mb-3 text-xl font-semibold">Kết quả</h2>
    <ul class="list rounded-xl border border-base-300 bg-base-200">
      {#each $convertMutation.data.items as item}
        <li class="list-row flex flex-wrap items-center justify-between gap-3">
          <span class="min-w-0 break-all font-medium">{item.name}</span>
          {#if item.success && item.downloadUrl}
            <a class="btn btn-outline btn-primary btn-sm" href={apiClient.defaults.baseURL + item.downloadUrl}>Tải PDF</a>
          {:else if item.success}
            <span class="badge badge-success badge-soft">Đã chuyển đổi</span>
          {:else}
            <span class="text-error">{item.error}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}
