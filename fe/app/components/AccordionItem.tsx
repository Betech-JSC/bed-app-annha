import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface AccordionItemProps {
    question: string;
    answer: string;
}

export default function AccordionItem({ question, answer }: AccordionItemProps) {
    const [expanded, setExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.header} onPress={toggleExpand}>
                <Text style={styles.question}>{question}</Text>
                <AntDesign name={expanded ? 'up' : 'down'} size={16} color="#555" />
            </TouchableOpacity>
            {expanded && <Text style={styles.answer}>{answer}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3,
        elevation: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    question: {
        fontSize: 16,
        fontWeight: '600',
        color: '#222',
        flex: 1,
        paddingRight: 10,
    },
    answer: {
        marginTop: 8,
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
});
