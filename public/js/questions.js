/**
 * Extrae todos los atributos únicos (claves y posibles valores) de un conjunto de personajes.
 * Ahora busca los atributos dentro del sub-objeto 'attributes'.
 *
 * @param {Array<Object>} characters - Un array de objetos de personajes.
 * @returns {Object} Un objeto donde las claves son nombres de atributos y los valores son Sets de sus posibles valores.
 */
function extractUniqueAttributes(characters) {
    const uniqueAttributes = {};
    const excludedAttributeKeys = [
        'birthName', 'nickName', 'description', 'knownFor', 'historicalImpact',
        'genre', 'notableFor', 'awards', 'sport', 'team', 'position', 'medals',
        'fieldOfStudy', 'fieldOfScience', 'species', 'color', 'enemy', 'armorType',
        'artisticMovement', 'musicalPeriod', 'location', 'material', 'timePeriod'
    ];

    characters.forEach(char => {
        if (char.attributes) {
            for (const key in char.attributes) {
                if (char.attributes.hasOwnProperty(key) && !excludedAttributeKeys.includes(key)) {
                    const value = char.attributes[key];

                    // Ignorar atributos con valor null, undefined o 'N/A'
                    if (value === null || typeof value === 'undefined' || value === 'N/A') {
                        continue;
                    }

                    if (uniqueAttributes[key]) {
                        uniqueAttributes[key].add(value);
                    } else {
                        uniqueAttributes[key] = new Set([value]);
                    }
                }
            }
        }
    });

    return uniqueAttributes;
}

/**
 * Formatea una clave de atributo (camelCase de la DB) y su valor a una pregunta legible en español.
 *
 * @param {string} key - La clave del atributo del objeto Character.attributes (ej: "hasGlasses", "hairColor").
 * @param {*} value - El valor del atributo (ej: true, "castaño", "masculino").
 * @returns {string|null} La pregunta formateada o null si no se debe generar una.
 */
function formatAttributeQuestion(key, value) {
    if (value === null) {
        return null;
    }

    const translations = {
        'gender': 'género',
        'occupationType': 'tipo de ocupación',
        'isAlive': 'está vivo/a',
        'isFictional': 'es ficticio/a',
        'nationality': 'nacionalidad',
        'continent': 'continente',
        'hasGlasses': 'gafas',
        'hasHat': 'sombrero',
        'skinColor': 'color de piel',
        'hairColor': 'el pelo',
        'eyeColor': 'los ojos',
        'facialHair': 'vello facial',
        'isPresident': 'es presidente',
        'isKingOrQueen': 'es rey o reina',
        'isAthlete': 'es atleta',
        'isMusician': 'es músico/a',
        'hasScars': 'cicatrices',
        'isBald': 'calvo/a',
        'era': 'era',
        'genre': 'género',
        'awards': 'premios',
        'sport': 'deporte',
        'team': 'equipo',
        'position': 'posición',
        'medals': 'medallas',
        'fieldOfStudy': 'campo de estudio',
        'fieldOfScience': 'campo de ciencia',
        'species': 'especie',
        'color': 'color',
        'hasClothes': 'ropa',
        'isAnthropomorphic': 'es antropomórfico/a',
        'isTalking': 'habla',
        'enemy': 'enemigo/a',
        'armorType': 'tipo de armadura',
        'artisticMovement': 'movimiento artístico',
        'musicalPeriod': 'periodo musical',
        'type': 'tipo',
        'isManMade': 'es hecho por el hombre',
        'isHistorical': 'es histórico',
        'isIconic': 'es icónico',
        'dominantColor': 'color dominante',
        'heightCategory': 'categoría de altura',
        'waterFeatureNearby': 'característica de agua cercana',
        'vegetationPresent': 'vegetación presente',
        'tourismAttraction': 'atracción turística',
    };

    const booleanTemplates = {
        'isAlive': { true: '¿Está vivo/a?', false: '¿Está muerto/a?' },
        'isFictional': { true: '¿Es un personaje ficticio?', false: '¿Es una persona real?' },
        'hasGlasses': { true: '¿Usa gafas?', false: '¿No usa gafas?' },
        'hasHat': { true: '¿Lleva sombrero?', false: '¿No lleva sombrero?' },
        'isBald': { true: '¿Es calvo/a?', false: '¿No es calvo/a?' },
        'hasScars': { true: '¿Tiene cicatrices?', false: '¿No tiene cicatrices?' },
    };

    if (typeof value === 'boolean') {
        if (booleanTemplates[key]) {
            return booleanTemplates[key][value];
        }
        if (translations[key]) {
            if (key.startsWith('is')) {
                return value ? `¿${translations[key]}?` : `¿No ${translations[key]}?`;
            }
            return value ? `¿Tiene ${translations[key]}?` : `¿No tiene ${translations[key]}?`;
        }
    }

    if (translations[key]) {
        switch (key) {
            case 'gender':
                return `¿Es de género ${value}?`;
            case 'hairColor':
                return `¿Tiene el pelo de color ${value}?`;
            case 'eyeColor':
                return `¿Tiene los ojos de color ${value}?`;
            case 'skinColor':
                return `¿Tiene la piel de color ${value}?`;
            case 'nationality':
                return `¿Es de nacionalidad ${value}?`;
            case 'occupationType':
                return `¿Es un/a ${value}?`;
            case 'era':
                return `¿Es de la ${value}?`;
            case 'enemy':
                return `¿Tiene a ${value} como enemigo/a?`;
            default:
                return `¿Tiene ${translations[key]} ${value}?`;
        }
    }

    const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
    return `¿Tiene ${formattedKey} ${value}?`;
}

/**
 * Genera y muestra botones de pregunta basados en los atributos únicos de los personajes.
 *
 * @param {Array<Object>} boardCharacters - El array de personajes actualmente en el tablero.
 * @param {HTMLElement} containerElement - El elemento del DOM donde se insertarán los botones de pregunta.
 * @param {Object} secretCharacter - El personaje secreto, necesario para la lógica de la pregunta.
 */
function generateAttributeQuestions(boardCharacters, containerElement, secretCharacter) {
    containerElement.innerHTML = '';
    const uniqueAttributes = extractUniqueAttributes(boardCharacters);

    for (const attrKey in uniqueAttributes) {
        if (uniqueAttributes.hasOwnProperty(attrKey)) {
            const possibleValues = Array.from(uniqueAttributes[attrKey]);

            if (possibleValues.some(val => typeof val === 'boolean')) {
                possibleValues.sort((a, b) => {
                    if (typeof a === 'boolean' && typeof b === 'boolean') {
                        return (a === b) ? 0 : (a ? -1 : 1);
                    }
                    return 0;
                });
            } else {
                possibleValues.sort();
            }

            possibleValues.forEach(attrValue => {
                const buttonText = formatAttributeQuestion(attrKey, attrValue);

                // Si formatAttributeQuestion devuelve null (porque el valor era null),
                // no creamos el botón.
                if (buttonText !== null) {
                    const questionButton = document.createElement('button');
                    questionButton.textContent = buttonText;
                    questionButton.classList.add('question-button');

                    questionButton.addEventListener('click', () => {
                        handleQuestionClick(attrKey, attrValue, boardCharacters, secretCharacter);
                    });
                    containerElement.appendChild(questionButton);
                }
            });
        }
    }
}
