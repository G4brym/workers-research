// Override Hono JSX types to allow string event handlers for SSR
// This is needed because we render HTML strings like onClick="doSomething()"

import "hono/jsx";

declare module "hono/jsx" {
	namespace JSX {
		interface HTMLAttributes {
			onClick?: string | ((event: MouseEvent) => void);
			onChange?: string | ((event: Event) => void);
			onInput?: string | ((event: Event) => void);
			onSubmit?: string | ((event: Event) => void);
		}
	}
}
