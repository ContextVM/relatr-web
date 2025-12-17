<script>
	import { LogOut, MoonIcon, SunIcon } from 'lucide-svelte';
	import Button from './ui/button/button.svelte';
	import { toggleMode } from 'mode-watcher';
		import AccountLoginDialog from './AccountLoginDialog.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import { activeAccount, logout } from '$lib/services/accountManager.svelte';

</script>

<header class="border-b bg-card">
	<div class="container mx-auto max-w-4xl px-6 py-4">
		<div class="flex items-center justify-between">
			<a href="/">
				<div class="flex items-center gap-4">
					<img src="/relatr-logo-min.svg" alt="Relatr Logo" class="h-12 w-auto dark:hidden" />
					<img
						src="/relatr-logo-white-min.svg"
						alt="Relatr Logo"
						class="hidden h-12 w-auto dark:block"
					/>
					<div>
						<h1 class="text-2xl font-bold">Relatr</h1>
						<p class="text-sm text-muted-foreground">Nostr Trust Network Search</p>
					</div>
				</div>
			</a>
			<div class=" flex items-center gap-4">
				<nav>
					<a
						href="/about"
						class="text-sm text-muted-foreground transition-colors hover:text-foreground"
					>
						About
					</a>
				</nav>
							<div class="flex items-center gap-2 sm:gap-4">
				{#if $activeAccount}
					<div class="hidden items-center gap-2 sm:flex sm:gap-3">
						<ProfileCard pubkey={$activeAccount.pubkey} />
								<Button variant="ghost" size="icon" onclick={logout} aria-label="Logout">
			<LogOut class="h-4 w-4" />
		</Button>
					</div>
				{:else}
					<div class="hidden sm:block">
						<AccountLoginDialog />
					</div>
				{/if}
			</div>
				<Button onclick={toggleMode} variant="outline" size="icon">
					<SunIcon
						class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
					/>
					<MoonIcon
						class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
					/>
					<span class="sr-only">Toggle theme</span>
				</Button>
			</div>
		</div>
	</div>
</header>
