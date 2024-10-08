import { RadioButtonSchema } from '$lib/schemas/add-staff-member'
import { supabase } from '$lib/supabaseClient'
import { redirect } from '@sveltejs/kit'
import { fail, message, superValidate } from 'sveltekit-superforms'
import { zod } from 'sveltekit-superforms/adapters'

export const load = async ({ cookies, url }) => {
    const step3Data = cookies.get('step3Data')
    const form = step3Data
        ? await superValidate(JSON.parse(step3Data), zod(RadioButtonSchema))
        : await superValidate(zod(RadioButtonSchema))
    const staffId = url.searchParams.get('staffId')

    return { form, staffId }
}

export const actions = {
    default: async ({ cookies, request, url }) => {
        const form = await superValidate(request, zod(RadioButtonSchema))

        // console.log('Form:', form)
        const staffId = url.searchParams.get('staffId')

        // Validate staffId
        if (
            !staffId ||
            !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
                staffId
            )
        ) {
            console.log('Invalid staffId:', staffId)
            return fail(400, {
                form,
                error: 'Invalid or missing staff ID',
            })
        }

        if (!form.valid) {
            console.log('Form is not valid', form.errors)
            return message(form, form.errors.role)
        }

        // console.log(form.data)
        const { data, error: updateError } = await supabase
            .from('staff')
            .update({ role: form.data.role }) // assuming form.data.role contains the role value
            .eq('id', staffId)

        if (updateError) {
            console.log('Supabase Error:', updateError)
            return fail(400, { error: updateError.message })
        }

        cookies.set('step3Data', JSON.stringify(form.data), {
            path: '/',
            httpOnly: true,
        })
        cookies.set(
            'formCompletion',
            JSON.stringify({ step1: true, step2: true, step3: true }),
            {
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                maxAge: 60 * 60 * 24, // Set cookie expiration (1 day in this case)
            }
        )
        throw redirect(303, `/staff-member/code?staffId=${staffId}`)
    },
}
