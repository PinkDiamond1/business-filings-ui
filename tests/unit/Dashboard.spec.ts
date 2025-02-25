// Libraries
import Vue from 'vue'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'
import VueRouter from 'vue-router'
import { shallowMount, createLocalVue, Wrapper } from '@vue/test-utils'
import mockRouter from './mockRouter'
import { getVuexStore } from '@/store'
import flushPromises from 'flush-promises'

// Components
import Dashboard from '@/views/Dashboard.vue'
import { CoaWarningDialog } from '@/components/dialogs'
import TodoList from '@/components/Dashboard/TodoList.vue'
import FilingHistoryList from '@/components/Dashboard/FilingHistoryList.vue'
import AddressListSm from '@/components/Dashboard/AddressListSm.vue'
import DirectorListSm from '@/components/Dashboard/DirectorListSm.vue'

Vue.use(Vuetify)
Vue.use(Vuelidate)

const vuetify = new Vuetify({})
const store = getVuexStore() as any // remove typings for unit tests

describe('Dashboard - UI', () => {
  const $route = { query: {} }
  let wrapper: Wrapper<Vue>
  let vm: any

  beforeEach(() => {
    // init store
    store.state.hasBlockerTask = false
    store.state.hasBlockerFiling = false
    store.state.isCoaPending = false

    // create wrapper for Dashboard
    // this stubs out the 5 sub-components
    wrapper = shallowMount(Dashboard, { store, vuetify, mocks: { $route } })
    vm = wrapper.vm
  })

  afterEach(() => {
    wrapper.destroy()
  })

  it('renders the dashboard sub-components properly', () => {
    expect(wrapper.find(CoaWarningDialog).exists()).toBe(true)
    expect(wrapper.find(TodoList).exists()).toBe(true)
    expect(wrapper.find(FilingHistoryList).exists()).toBe(true)
    expect(wrapper.find(AddressListSm).exists()).toBe(true)
    expect(wrapper.find(DirectorListSm).exists()).toBe(true)
  })

  it('updates its counts from sub-component events', () => {
    wrapper.find(TodoList).vm.$emit('todo-count', 2)
    wrapper.find(FilingHistoryList).vm.$emit('history-count', 3)

    expect(vm.todoCount).toEqual(2)
    expect(vm.historyCount).toEqual(3)
  })

  it('enables standalone filing buttons when there are no blockers', () => {
    // re-mount the component since setting session storage is not reactive
    sessionStorage.setItem('BUSINESS_ID', 'CP1234567')
    const localWrapper: Wrapper<Vue> = shallowMount(Dashboard, { store, vuetify, mocks: { $route } })
    const localVm: any = localWrapper.vm

    store.state.hasBlockerTask = false
    store.state.hasBlockerFiling = false
    store.state.isCoaPending = false
    expect(localVm.hasBlocker).toEqual(false)

    expect(localVm.isAllowed('fileAddressChange')).toBe(true)
    expect(localVm.isAllowed('fileDirectorChange')).toBe(true)

    expect(localWrapper.find('#standalone-addresses-button').attributes('disabled')).toBeUndefined()
    expect(localWrapper.find('#standalone-directors-button').attributes('disabled')).toBeUndefined()
  })

  it('disables standalone filing buttons when there is a blocker task', () => {
    // re-mount the component since setting session storage is not reactive
    sessionStorage.setItem('BUSINESS_ID', 'CP1234567')
    const localWrapper: Wrapper<Vue> = shallowMount(Dashboard, { store, vuetify, mocks: { $route } })
    const localVm: any = localWrapper.vm

    store.state.hasBlockerTask = true
    store.state.hasBlockerFiling = false
    store.state.isCoaPending = false
    expect(localVm.hasBlocker).toEqual(true)

    expect(localVm.isAllowed('fileAddressChange')).toBe(false)
    expect(localVm.isAllowed('fileDirectorChange')).toBe(false)

    expect(localWrapper.find('#standalone-addresses-button').attributes('disabled')).toBe('true')
    expect(localWrapper.find('#standalone-directors-button').attributes('disabled')).toBe('true')
  })

  it('disables standalone filing buttons when there is a blocker filing', () => {
    // re-mount the component since setting session storage is not reactive
    sessionStorage.setItem('BUSINESS_ID', 'CP1234567')
    const localWrapper: Wrapper<Vue> = shallowMount(Dashboard, { store, vuetify, mocks: { $route } })
    const localVm: any = localWrapper.vm

    store.state.hasBlockerTask = false
    store.state.hasBlockerFiling = true
    store.state.isCoaPending = false
    expect(localVm.hasBlocker).toEqual(true)

    expect(localVm.isAllowed('fileAddressChange')).toBe(false)
    expect(localVm.isAllowed('fileDirectorChange')).toBe(false)

    expect(localWrapper.find('#standalone-addresses-button').attributes('disabled')).toBe('true')
    expect(localWrapper.find('#standalone-directors-button').attributes('disabled')).toBe('true')
  })

  it('disables filing buttons when there is a BCOMP Future Effective COA', () => {
    // re-mount the component since setting session storage is not reactive
    sessionStorage.setItem('BUSINESS_ID', 'CP1234567')
    const localWrapper: Wrapper<Vue> = shallowMount(Dashboard, { store, vuetify, mocks: { $route } })
    const localVm: any = localWrapper.vm

    store.state.hasBlockerTask = false
    store.state.hasBlockerFiling = false
    store.state.isCoaPending = true
    expect(localVm.hasBlocker).toEqual(true)

    expect(localVm.isAllowed('fileAddressChange')).toBe(false)
    expect(localVm.isAllowed('fileDirectorChange')).toBe(false)

    expect(localWrapper.find('#standalone-addresses-button').attributes('disabled')).toBe('true')
    expect(localWrapper.find('#standalone-directors-button').attributes('disabled')).toBe('true')
  })

  it('disables standalone filing buttons when there is no Business ID', () => {
    // re-mount the component since setting session storage is not reactive
    sessionStorage.removeItem('BUSINESS_ID')
    const localWrapper: Wrapper<Vue> = shallowMount(Dashboard, { store, vuetify, mocks: { $route } })
    const localVm: any = localWrapper.vm

    store.state.hasBlockerTask = false
    store.state.hasBlockerFiling = false
    store.state.isCoaPending = false
    expect(localVm.hasBlocker).toEqual(false)

    expect(localVm.isAllowed('fileAddressChange')).toBe(false)
    expect(localVm.isAllowed('fileDirectorChange')).toBe(false)

    expect(localWrapper.find('#standalone-addresses-button').attributes('disabled')).toBe('true')
    expect(localWrapper.find('#standalone-directors-button').attributes('disabled')).toBe('true')
  })
})

describe('Dashboard - Route Parameter Tests', () => {
  beforeAll(() => {
    // init store
    store.state.hasBlockerTask = false
    store.state.hasBlockerFiling = false
    store.state.isCoaPending = false
  })

  it('sets Filing Id to a falsy value when the route query parameter doesn\'t exist', () => {
    const $route = { query: {} }
    const wrapper = shallowMount(Dashboard, { store, mocks: { $route } })
    const vm = wrapper.vm as any

    expect(vm.filingId).toBeFalsy()

    wrapper.destroy()
  })

  it('sets Filing Id to the numeric value of the route query parameter when it exists', () => {
    const $route = { query: { filing_id: '123' } }
    const wrapper = shallowMount(Dashboard, { store, mocks: { $route } })
    const vm = wrapper.vm as any

    expect(vm.filingId).toBe(123)

    wrapper.destroy()
  })
})

describe('Dashboard - Click Tests', () => {
  beforeAll(() => {
    // init store
    store.state.hasBlockerTask = false
    store.state.hasBlockerFiling = false
    store.state.isCoaPending = false
  })

  it('routes to Standalone Office Address Filing page when EDIT is clicked', async () => {
    sessionStorage.setItem('BUSINESS_ID', 'CP1234567')
    // init store
    store.state.identifier = 'CP1234567'
    store.state.entityType = 'CP'

    // create a Local Vue and install router on it
    const localVue = createLocalVue()
    localVue.use(VueRouter)
    const router = mockRouter.mock()
    router.push({ name: 'dashboard', query: {} })

    const wrapper = shallowMount(Dashboard, { localVue, store, router, vuetify })
    const vm = wrapper.vm as any

    const button = wrapper.find('#standalone-addresses-button')
    expect(button.text()).toContain('Change')
    button.trigger('click')
    await flushPromises()

    // verify routing to Standalone Office Address Filing page with id=0
    expect(vm.$route.name).toBe('standalone-addresses')
    expect(vm.$route.params.filingId).toBe(0)

    wrapper.destroy()
  })

  it('displays the change of address warning dialog as a BCOMP', async () => {
    sessionStorage.setItem('BUSINESS_ID', 'BC1234567')
    // init store
    store.state.identifier = 'BC1234567'
    store.state.entityType = 'BEN'

    // create a Local Vue and install router on it
    const localVue = createLocalVue()
    localVue.use(VueRouter)
    const router = mockRouter.mock()
    router.push({ name: 'dashboard', query: {} })

    const wrapper = shallowMount(Dashboard, { localVue, store, router, vuetify })
    const vm = wrapper.vm as any

    vm.coaWarningDialog = false // initially hidden

    const button = wrapper.find('#standalone-addresses-button')
    expect(button.text()).toContain('Change')
    button.trigger('click')
    await flushPromises()

    expect(vm.coaWarningDialog).toBe(true)
    expect(wrapper.find('#dialog-toggle-button')).toBeDefined()
    expect(wrapper.find('#dialog-proceed-button')).toBeDefined()

    wrapper.find(CoaWarningDialog).vm.$emit('proceed', true)

    expect(vm.$route.name).toBe('standalone-addresses')
    expect(vm.$route.params.filingId).toBe(0)

    wrapper.destroy()
  })

  it('routes to Standalone Directors Filing page when EDIT is clicked', async () => {
    sessionStorage.setItem('BUSINESS_ID', 'CP1234567')
    // init store
    store.state.identifier = 'CP1234567'

    // create a Local Vue and install router on it
    const localVue = createLocalVue()
    localVue.use(VueRouter)
    const router = mockRouter.mock()
    router.push({ query: {} })

    const wrapper = shallowMount(Dashboard, { localVue, store, router, vuetify })
    const vm = wrapper.vm as any

    const button = wrapper.find('#standalone-directors-button')
    expect(button.text()).toContain('Change')
    button.trigger('click')
    await flushPromises()

    // verify routing to Standalone Directors Filing page with id=0
    expect(vm.$route.name).toBe('standalone-directors')
    expect(vm.$route.params.filingId).toBe(0)

    wrapper.destroy()
  })
})
