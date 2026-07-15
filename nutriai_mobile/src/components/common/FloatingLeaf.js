import React from 'react';
import { Image } from 'react-native';
import DaunImg from '../../../assets/daun1.png';

export default function FloatingLeaf() {
  return (
    <Image
      source={DaunImg}
      style={{
        width: 112,
        height: 112,
        resizeMode: 'contain',
        flexShrink: 0,
        marginRight: -65,  // lebih rapat ke BmiCard
        marginTop: -22,    // naik
      }}
    />
  );
}