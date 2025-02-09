<template>
  <v-dialog v-model="dialog" width="45rem" persistent :attach="attach" content-class="add-notation-dialog">
    <v-card>
      <v-card-title id="dialog-title">
        <span v-if="administrativeDissolution" id="dialog-title"><strong>{{displayName}}</strong></span>
        <span v-else-if="putBackOn" id="dialog-title"><strong>Correction - {{displayName}}</strong></span>
        <span v-else id="dialog-title"><strong>Add a {{displayName}}</strong> </span>
      </v-card-title>
      <v-card-text>
        <div id="dialog-text" class="dialog-text">
          <p v-if="administrativeDissolution"> You are about to dissolve
          <strong><span class="text-uppercase">{{getEntityName}}</span>, {{getIdentifier}}</strong> . </p>
          <p v-if="putBackOn"> You are about to put <strong><span class="text-uppercase">{{getEntityName}}</span>,
          {{getIdentifier}}</strong> back on the register.</p>
        </div>
        <div id="notation-text" class="mb-4 mt-2 pt-4">
          Enter a {{(administrativeDissolution || putBackOn) ? 'Detail' : displayName}}
          that will appear on the ledger for this entity
        </div>
        <v-form ref="notationFormRef" v-model="notationFormValid" id="notation-form">
          <v-textarea
            v-model="notation"
            class="text-input-field mb-2"
            filled
            :label="(administrativeDissolution || putBackOn) ? 'Add Detail' : displayName"
            id="notation"
            rows="5"
            :no-resize="true"
            :rules="notationRules"
            :counter="notationMaxLength"
          />
        </v-form>
        <div>
          If this filing is pursuant to a court order, enter the court order number. If this filing is pursuant
          to a plan of arrangement, enter the court order number and select Plan of Arrangement.
        </div>
        <CourtOrderPoa
          id="court-order"
          @emitCourtNumber="setFileNumber($event)"
          @emitPoa="setHasPlanOfArrangement($event)"
          :displaySideLabels="false"
          :key="courtOrderKey"
          :autoValidation="enableValidation"
          :courtOrderNumberRequired="courtOrderNumberRequired"
          ref="courtOrderPoaRef"
        />
      </v-card-text>
      <v-divider class="mb-4"></v-divider>
      <v-card-actions class="pt-0">
        <v-spacer></v-spacer>
        <div class="form__btns">
          <v-btn text color="primary"
            id="dialog-save-button"
            :loading="saving"
            @click.native="save()"
            class="save-btn"
          > {{(administrativeDissolution || putBackOn) ? 'File' : 'Save'}} </v-btn>
          <v-btn text color="primary"
            id="dialog-cancel-button"
            :disabled="saving"
            @click.native="emitClose(false)"
          >Cancel</v-btn>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch, Emit, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import { DateMixin, EnumMixin } from '@/mixins'
import axios from '@/axios-auth'
import { CourtOrderPoa } from '@bcrs-shared-components/court-order-poa'
import { FormIF } from '@/interfaces'
import { EffectOfOrderTypes, FilingTypes, DissolutionTypes } from '@/enums'

@Component({
  components: {
    CourtOrderPoa
  }
})
export default class AddStaffNotationDialog extends Mixins(DateMixin, EnumMixin) {
  $refs!: Vue['$refs'] & {
    courtOrderPoaRef: FormIF,
    notationFormRef: FormIF
  }

  /** Prop for the item's display name. */
  @Prop() readonly displayName: string

  /** Prop for the item's name (filing type). */
  @Prop() readonly name: FilingTypes

  /** Prop for the item's dissolution type. */
  @Prop() readonly dissolutionType?: DissolutionTypes

  /** Prop to display the dialog. */
  @Prop({ default: false }) readonly dialog: boolean

  /** Prop to provide attachment selector. */
  @Prop() readonly attach: string

  /** Prop to require court order number regardless the plan of arrangement. */
  @Prop({ default: false }) readonly courtOrderNumberRequired: boolean

  @Getter getIdentifier!: string
  @Getter getCurrentDate!: string
  @Getter getEntityName!: string
  @Getter getBusinessNumber!: string
  @Getter getEntityType!: string
  @Getter getEntityFoundingDate!: Date
  @Getter isFirm!: boolean

  /** The notation text. */
  private notation: string = ''

  /** Court Order Number */
  private courtOrderNumber:string = null

  /** Whether filing has plan of arrangement. */
  private planOfArrangement = false

  /** Whether this component is currently saving. */
  private saving = false

  /** Court Order component key */
  private courtOrderKey = 0

  /** Notation form validity */
  private notationFormValid = false

  /** Notation max length */
  private notationMaxLength = 2000

  /** Flag to enable validation in this component */
  private enableValidation = false

  /** Whether this filing is an administrative dissolution */
  private get administrativeDissolution (): boolean {
    return this.isTypeAdministrativeDissolution({ name: this.name, dissolutionType: this.dissolutionType })
  }

  /** Whether this filing is a put back on */
  private get putBackOn (): boolean {
    return this.isTypePutBackOn({ name: this.name })
  }

  private get notationRules (): Array<Function> {
    if (this.enableValidation) {
      return [
        (v: string) => !!v || ((this.administrativeDissolution || this.putBackOn) ? 'Enter a detailed comment'
          : `Enter a ${this.displayName}`),
        (v: string) => v.length <= this.notationMaxLength || 'Maximum characters exceeded.'
      ]
    } else return []
  }

  private setFileNumber (courtOrderNumber: string): void {
    this.courtOrderNumber = courtOrderNumber
  }

  private setHasPlanOfArrangement (planOfArrangement: boolean):void {
    this.planOfArrangement = planOfArrangement
  }
  /** Called when prop changes (ie, dialog is shown/hidden). */
  @Watch('dialog')
  private async onDialogChanged (val: boolean): Promise<void> {
    // when dialog is shown, reset notation and validation
    if (val) {
      this.notation = ''
      await Vue.nextTick()
      this.$refs.notationFormRef.resetValidation()

      // This will make CourtOrderPoa to re-render as it will have a different key every time it opens the dialog.
      // Source: https://michaelnthiessen.com/force-re-render/
      this.courtOrderKey++
    }
  }

  /**
   * Emits event to close this dialog.
   * @param needReload Whether the dashboard needs to be reloaded.
   */
  @Emit('close')
  private emitClose (needReload: boolean): void {
    this.enableValidation = false
  }

  /** Saves the current notation. */
  private async save (): Promise<void> {
    // prevent double saving
    if (this.saving) return
    this.saving = true

    this.enableValidation = true
    await this.$nextTick()
    const isNotationFormRefValid = this.$refs.notationFormRef.validate()
    const isCourtOrderPoaFormRefValid = this.$refs.courtOrderPoaRef.validate()

    if (!isNotationFormRefValid || !isCourtOrderPoaFormRefValid) {
      this.saving = false
      return
    }

    const data : any = {
      filing: {
        header: {
          name: this.name,
          date: this.getCurrentDate, // NB: API will reassign this date according to its clock
          certifiedBy: ''
        },
        business: {
          identifier: this.getIdentifier
        },
        [this.name]: {
        }
      }
    }

    if (this.putBackOn) {
      data.filing.business = { ...data.filing.business,
        legalType: this.getEntityType,
        legalName: this.getEntityName,
        foundingDate: this.getEntityFoundingDate
      }
      data.filing[this.name] = { ...data.filing[this.name],
        details: this.notation
      }
      if (this.courtOrderNumber) {
        data.filing[this.name] = { ...data.filing[this.name],
          courtOrder: {
            effectOfOrder: (this.planOfArrangement ? EffectOfOrderTypes.PLAN_OF_ARRANGEMENT : ''),
            fileNumber: (this.courtOrderNumber ? this.courtOrderNumber : '')
          }
        }
      }
    } else if (this.administrativeDissolution) {
      data.filing.business = { ...data.filing.business,
        legalType: this.getEntityType,
        legalName: this.getEntityName,
        foundingDate: this.getEntityFoundingDate
      }
      data.filing[this.name] = { ...data.filing[this.name],
        dissolutionType: 'administrative',
        dissolutionDate: this.getCurrentDate,
        details: this.notation
      }
      if (this.courtOrderNumber) {
        data.filing[this.name] = { ...data.filing[this.name],
          courtOrder: {
            effectOfOrder: (this.planOfArrangement ? EffectOfOrderTypes.PLAN_OF_ARRANGEMENT : ''),
            fileNumber: (this.courtOrderNumber ? this.courtOrderNumber : ''),
            orderDetails: this.notation
          }
        }
      }
    } else {
      data.filing[this.name] = { ...data.filing[this.name],
        orderDetails: this.notation
      }
    }

    const url = `businesses/${this.getIdentifier}/filings`
    let success = false
    await axios.post(url, data).then(res => {
      success = true
    }).catch(error => {
      // eslint-disable-next-line no-console
      console.log('save() error =', error)
      let fileType
      if (this.putBackOn) {
        fileType = 'put back on filing'
      } else if (this.administrativeDissolution) {
        fileType = 'administrative dissolution filing'
      } else {
        fileType = 'notation'
      }
      alert('Could not save your ' + fileType + '. Please try again or cancel.')
      this.saving = false
    })

    this.saving = false
    if (success) this.emitClose(true)
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/theme.scss';
::v-deep {
  #court-order div.pl-2 {
    padding-left: 0 !important;
  }
  #court-order {
    padding-right: 0 !important;
    padding-top: 0 !important;
    margin-top: 0 !important;
    padding-bottom: 0 !important;
  }
  #court-order .v-input--checkbox .v-input__slot {
    margin-bottom: 0 !important;
  }
  #court-order .v-input--checkbox {
    margin-top: 0.5rem;
    padding-top: 0;
  }
}
.save-btn {
  font-weight: bold;
}
.v-card__subtitle, .v-card__text {
  font-weight: normal;
  color: $gray7;
  font-size: $px-16;
}
</style>
