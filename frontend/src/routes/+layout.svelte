<script lang="ts">
  import { page } from '$app/state';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { Snippet } from 'svelte';
  import '../app.css';

  let { children }: { children: Snippet } = $props();
  const queryClient = new QueryClient();
  const groups = [
    {
      label: 'Bảng tính',
      links: [{ label: 'Lịch báo giảng', href: '/excel/teaching-schedule' }]
    },
    {
      label: 'Tài liệu',
      links: [
        { label: 'Chuyển DOCX sang PDF', href: '/pdf/convert' },
        { label: 'Sao chép PDF có mật khẩu', href: '/pdf/copy-protected' }
      ]
    },
    {
      label: 'Thư tín',
      links: [{ label: 'Thư tháng', href: '/monthly-mail' }]
    }
  ];
  const activeGroup = $derived(groups.find((group) =>
    group.links.some((link) => link.href === page.url.pathname)
  ));
</script>

<svelte:head>
  <title>NMA Serve Tools</title>
  <meta name="theme-color" content="#172641" />
</svelte:head>

<QueryClientProvider client={queryClient}>
  <div class="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
    <aside class="bg-[#142441] px-4 py-4 text-[#d8e3f8] sm:px-6 lg:py-8">
      <a href="/" class="flex items-center gap-3 rounded-lg font-bold text-white">
        <span class="grid size-10 place-items-center rounded-xl bg-[#285bd4] text-xs tracking-wide" aria-hidden="true">NMA</span>
        <span>Serve Tools</span>
      </a>
      <nav aria-label="Điều hướng chính" class="mt-3 lg:mt-10">
        <ul class="menu menu-horizontal w-full gap-x-2 gap-y-1 p-0 lg:menu-vertical lg:gap-4">
          {#each groups as group (group.label)}
            <li>
              <span class="menu-title hidden px-3 text-[#a5b7d6] lg:block">{group.label}</span>
              <ul class="m-0 flex flex-wrap gap-1 p-0 before:hidden lg:grid">
                {#each group.links as link (link.href)}
                  <li>
                    <a
                      href={link.href}
                      aria-current={page.url.pathname === link.href ? 'page' : undefined}
                      class="rounded-lg px-3 py-2 text-sm hover:bg-white/10 aria-[current=page]:bg-[#2855ae] aria-[current=page]:text-white lg:py-3"
                    >{link.label}</a>
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>
      </nav>
    </aside>

    <main class="min-w-0">
      <header class="flex min-h-14 items-center border-b border-base-300 bg-base-100 px-5 sm:px-10">
        <div class="breadcrumbs text-sm">
          <ul><li>Công cụ</li>{#if activeGroup}<li>{activeGroup.label}</li>{/if}</ul>
        </div>
      </header>
      <div class="mx-auto max-w-5xl px-4 py-7 sm:px-10 sm:py-12">
        <div class="card tool-card border border-base-300 bg-base-100 shadow-sm">
          <div class="card-body gap-0 p-5 sm:p-9">
            {@render children()}
          </div>
        </div>
      </div>
    </main>
  </div>
</QueryClientProvider>
