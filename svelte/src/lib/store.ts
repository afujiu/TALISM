import { writable } from 'svelte/store'

import { AccountClass } from '$lib/AccountClass'
const accountInstance = new AccountClass()
export const account = writable(accountInstance)

import { UiClass } from '$lib/UiClass.svelte'
const uiInstance = new UiClass()
export const ui = writable(uiInstance)


