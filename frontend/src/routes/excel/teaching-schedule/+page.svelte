<script lang="ts">
  import { createMutation } from '@tanstack/svelte-query';
  import {
    getApiErrorMessage,
    getTeachingScheduleSubjects,
    updateTeachingSchedule
  } from '../../../lib/api/client';

  let previousWeek: File | undefined = $state();
  let currentWeek: File | undefined = $state();
  let subjects: string[] = $state([]);
  let choices: string[] = $state([]);
  let mappings: Record<string, string> = $state({});

  const subjectsMutation = createMutation({ mutationFn: getTeachingScheduleSubjects });
  const updateMutation = createMutation({ mutationFn: updateTeachingSchedule });

  async function loadSubjects() {
    subjects = [];
    choices = [];
    mappings = {};
    $subjectsMutation.reset();
    $updateMutation.reset();
    if (!currentWeek) return;

    const selectedFile = currentWeek;
    try {
      const result = await $subjectsMutation.mutateAsync(selectedFile);
      if (currentWeek !== selectedFile) return;
      subjects = result.subjects;
      choices = result.choices;
      mappings = Object.fromEntries(
        subjects.map((subject) => [subject, choices.includes(subject) ? subject : choices[0]])
      );
    } catch {
      // Lỗi được hiển thị từ $subjectsMutation.
    }
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!previousWeek || !currentWeek) return;
    $updateMutation.reset();

    try {
      const result = await $updateMutation.mutateAsync({
        previousWeek,
        currentWeek,
        subjectMappings: mappings
      });
      download(result, currentWeek.name.replace(/(\.xlsx?)$/i, ' - PPCT$1'));
    } catch {
      // Lỗi được hiển thị từ $updateMutation.
    }
  }

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }
</script>

<h1 class="mb-2 text-3xl font-bold tracking-tight md:text-4xl">Cập nhật tiết PPCT</h1>
<p class="mb-7 leading-6 text-base-content/65">Đánh số tiết tuần mới từ tuần cũ theo từng môn học và lớp.</p>

{#if $subjectsMutation.isError}
  <div class="mb-5 alert alert-error alert-soft" role="alert">
    {getApiErrorMessage($subjectsMutation.error, 'Không đọc được danh sách môn học.')}
  </div>
{/if}
{#if $updateMutation.isError}
  <div class="mb-5 alert alert-error alert-soft" role="alert">
    {getApiErrorMessage($updateMutation.error, 'Không xử lý được lịch báo giảng.')}
  </div>
{/if}

<form class="grid gap-5" onsubmit={submit}>
  <div class="grid gap-5 sm:grid-cols-2">
    <label class="grid gap-2 text-sm font-semibold">
      Tệp Excel tuần cũ
      <input
        class="file-input"
        type="file"
        accept=".xls,.xlsx"
        required
        onchange={(event) => previousWeek = event.currentTarget.files?.[0]}
      />
    </label>
    <label class="grid gap-2 text-sm font-semibold">
      Tệp Excel tuần mới
      <input
        class="file-input"
        type="file"
        accept=".xls,.xlsx"
        required
        onchange={(event) => {
          currentWeek = event.currentTarget.files?.[0];
          loadSubjects();
        }}
      />
    </label>

  </div>

  {#if $subjectsMutation.isPending}
    <p class="flex items-center gap-2 text-sm" role="status"><span class="loading loading-spinner loading-xs"></span> Đang đọc danh sách môn học…</p>
  {/if}

  {#if subjects.length}
    <div class="grid gap-4 pt-2">
      <h2 class="m-0 text-xl font-semibold">Đổi tên môn học</h2>
      {#each subjects as subject}
        <label class="grid gap-2 text-sm font-semibold">
          Đổi tên môn cho {subject}
          <select class="select" bind:value={mappings[subject]}>
            {#each choices as choice}
              <option value={choice}>{choice}</option>
            {/each}
          </select>
        </label>
      {/each}
    </div>
  {/if}

  <button
    class="btn btn-primary btn-lg justify-self-start"
    disabled={$updateMutation.isPending || $subjectsMutation.isPending || !previousWeek || !currentWeek}
  >
    {$updateMutation.isPending ? 'Đang xử lý…' : 'Cập nhật và tải Excel'}
  </button>
</form>
