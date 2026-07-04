import { TextStyle } from 'react-native';

export const typography = {
  displayLarge: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  } as TextStyle,
  display: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  } as TextStyle,
  title: {
    fontSize: 24,
    fontWeight: '700',
  } as TextStyle,
  heading: {
    fontSize: 18,
    fontWeight: '600',
  } as TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '400',
  } as TextStyle,
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500',
  } as TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '400',
  } as TextStyle,
  captionMedium: {
    fontSize: 13,
    fontWeight: '500',
  } as TextStyle,
  small: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } as TextStyle,
} as const;
