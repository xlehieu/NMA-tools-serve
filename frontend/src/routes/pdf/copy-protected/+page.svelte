<script lang="ts">
  import { createMutation } from '@tanstack/svelte-query';
  import { apiClient, copyProtectedPdf, getApiErrorMessage } from '../../../lib/api/client';

  let file: File | undefined = $state();
  let password = $state('');

  const copyMutation = createMutation({ mutationFn: copyProtectedPdf });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!file) return;

    try {
      const result = await $copyMutation.mutateAsync({ file, password });
      window.location.href = apiClient.defaults.baseURL + result.downloadUrl;
    } catch {
      // Lỗi được hiển thị trực tiếp từ mutation.
    }
  }
</script>

<h1 class="mb-2 text-3xl font-bold tracking-tight md:text-4xl">Sao chép PDF có mật khẩu</h1>
<p class="mb-7 leading-6 text-base-content/65">Tạo một bản sao PDF có thể mở được bằng mật khẩu bạn cung cấp.</p>

{#if $copyMutation.isError}
  <div class="mb-5 alert alert-error alert-soft" role="alert">
    {getApiErrorMessage($copyMutation.error, 'Không sao chép được PDF.')}
  </div>
{/if}

<form class="grid gap-5" onsubmit={submit}>
  <label class="grid gap-2 text-sm font-semibold">
    File PDF
    <input
      class="file-input"
      type="file"
      accept=".pdf"
      required
      onchange={(event) => {
        file = event.currentTarget.files?.[0];
        $copyMutation.reset();
      }}
    />
  </label>
  <label class="grid gap-2 text-sm font-semibold">
    Mật khẩu mở PDF
    <input class="input" type="password" bind:value={password} required />
  </label>
  <button
    class="btn btn-primary btn-lg justify-self-start"
    disabled={$copyMutation.isPending}
  >
    {$copyMutation.isPending ? 'Đang xử lý…' : 'Tạo và tải PDF'}
  </button>
</form>
