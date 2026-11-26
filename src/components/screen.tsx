import { useState, type ReactNode, type Ref } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { colors } from '@/theme'

type ScrollHandle = React.ComponentRef<typeof ScrollView>

export function ScreenFrame({
  header,
  children,
  onScroll,
  scrollRef,
}: {
  header: ReactNode
  children: ReactNode
  onScroll?: (y: number) => void
  scrollRef?: Ref<ScrollHandle>
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={styles.root}>
      <View style={styles.column}>
        <View style={{ paddingTop: insets.top + 8 }}>{header}</View>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          scrollEventThrottle={16}
          onScroll={onScroll ? (event) => onScroll(event.nativeEvent.contentOffset.y) : undefined}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  )
}

export function Header({
  title,
  serif = true,
  children,
}: {
  title: string
  serif?: boolean
  children?: ReactNode
}) {
  return (
    <View style={styles.header}>
      <Text numberOfLines={1} style={serif ? styles.titleSerif : styles.titleSans}>
        {title}
      </Text>
      <View style={styles.headerActions}>{children}</View>
    </View>
  )
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  testID,
  compact,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  testID?: string
  compact?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        compact && styles.compact,
        pressed && !disabled && styles.primaryPressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  )
}

export function DangerButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.danger, pressed && !disabled && styles.dangerPressed, disabled && styles.disabled]}
    >
      <Text style={styles.primaryLabel}>{label}</Text>
    </Pressable>
  )
}

export function OutlineButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.outline, pressed && !disabled && styles.outlinePressed, disabled && styles.disabled]}
    >
      <Text style={styles.outlineLabel}>{label}</Text>
    </Pressable>
  )
}

export function TextButton({
  label,
  onPress,
  danger,
  testID,
}: {
  label: string
  onPress: () => void
  danger?: boolean
  testID?: string
}) {
  return (
    <Pressable accessibilityRole="button" testID={testID} onPress={onPress} hitSlop={8} style={styles.textButton}>
      <Text style={[styles.textButtonLabel, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  )
}

export function PaperInput({
  tone = 'white',
  style,
  onFocus,
  onBlur,
  ...input
}: TextInputProps & { tone?: 'white' | 'card' }) {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      autoCorrect={false}
      {...input}
      onFocus={(event) => {
        setFocused(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        onBlur?.(event)
      }}
      style={[styles.input, tone === 'card' && styles.inputCard, focused && styles.inputFocused, style]}
    />
  )
}

export function Field({
  label,
  trailing,
  ...input
}: {
  label?: string
  trailing?: ReactNode
} & TextInputProps) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.fieldRow}>
        <PaperInput {...input} style={input.multiline ? styles.inputMulti : undefined} />
        {trailing}
      </View>
    </View>
  )
}

export function Note({ children }: { children: string }) {
  return <Text style={styles.note}>{children}</Text>
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>
}

export function amountStyle(value: number | null): StyleProp<TextStyle> {
  if (value === null || value === 0) return styles.even
  return value > 0 ? styles.win : styles.loss
}

export function useNarrow(): boolean {
  const { width } = useWindowDimensions()
  return width < 360
}

export function rowStyle(): StyleProp<ViewStyle> {
  return styles.actionRow
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    minHeight: 52,
  },
  titleSerif: {
    flex: 1,
    color: colors.ink,
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.4,
  },
  titleSans: {
    flex: 1,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 12,
  },
  primary: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.felt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  compact: {
    flexGrow: 0,
    paddingHorizontal: 18,
  },
  primaryPressed: {
    backgroundColor: colors.feltPressed,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  danger: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  dangerPressed: {
    backgroundColor: colors.dangerPressed,
  },
  outline: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  outlinePressed: {
    backgroundColor: '#f4ece3',
  },
  outlineLabel: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.42,
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  textButtonLabel: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerText: {
    color: colors.danger,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 11,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 17,
  },
  inputFocused: {
    borderColor: colors.felt,
  },
  inputCard: {
    backgroundColor: colors.card,
  },
  inputMulti: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  note: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  section: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  win: {
    color: colors.win,
  },
  loss: {
    color: colors.loss,
  },
  even: {
    color: colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
})
