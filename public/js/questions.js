// public/js/questions.js

/**
 * Extrae todos los atributos únicos (claves y posibles valores) de un conjunto de personajes.
 * Ahora busca los atributos dentro del sub-objeto 'attributes'.
 *
 * @param {Array<Object>} characters - Un array de objetos de personajes.
 * @returns {Object} Un objeto donde las claves son nombres de atributos y los valores son Sets de sus posibles valores.
 */
function extractUniqueAttributes(characters) {
    const uniqueAttributes = {};
    // Excluye los campos que no son atributos de juego, incluso si están en el sub-objeto 'attributes'
    // Los que tienen "N/A" o son muy específicos de descripción pueden ser excluidos si no quieres preguntas sobre ellos.
    const excludedAttributeKeys = [
        'birthName', 'nickName', 'description', 'knownFor', 'historicalImpact',
        'genre', 'notableFor', 'awards', 'sport', 'team', 'position', 'medals',
        'fieldOfStudy', 'fieldOfScience', 'species', 'color', 'enemy', 'armorType',
        'artisticMovement', 'musicalPeriod', 'location', 'material', 'timePeriod'
    ];


    characters.forEach(char => {
        // Asegúrate de que el personaje tenga un objeto 'attributes'
        if (char.attributes) {
            for (const key in char.attributes) {
                if (char.attributes.hasOwnProperty(key) && !excludedAttributeKeys.includes(key)) {
                    const value = char.attributes[key];

                    // Ignorar atributos con valor null, undefined o 'N/A' si no queremos preguntar sobre ellos
                    if (value === null || typeof value === 'undefined' || value === 'N/A') {
                        continue;
                    }

                    // Si el atributo ya existe en uniqueAttributes, añade el valor al Set
                    if (uniqueAttributes[key]) {
                        uniqueAttributes[key].add(value);
                    } else {
                        // Si es un nuevo atributo, crea un nuevo Set con el valor
                        uniqueAttributes[key] = new Set([value]);
                    }
                }
            }
        }
    });

    return uniqueAttributes;
}

/**
 * Genera y muestra botones de pregunta basados en los atributos únicos de los personajes.
 *
 * @param {Array<Object>} boardCharacters - El array de personajes actualmente en el tablero.
 * @param {HTMLElement} containerElement - El elemento del DOM donde se insertarán los botones de pregunta.
 * @param {Object} secretCharacter - El personaje secreto, necesario para la lógica de la pregunta.
 */
function generateAttributeQuestions(boardCharacters, containerElement, secretCharacter) {
    containerElement.innerHTML = ''; // Limpiar el contenedor

    const uniqueAttributes = extractUniqueAttributes(boardCharacters);


    // Iterar sobre cada atributo único y generar botones
    for (const attrKey in uniqueAttributes) {
        if (uniqueAttributes.hasOwnProperty(attrKey)) {
            const possibleValues = Array.from(uniqueAttributes[attrKey]);

            // Ordenar valores booleanos para consistencia (true antes de false)
            if (possibleValues.some(val => typeof val === 'boolean')) {
                possibleValues.sort((a, b) => {
                    if (typeof a === 'boolean' && typeof b === 'boolean') {
                        return (a === b) ? 0 : (a ? -1 : 1);
                    }
                    return 0; // Mantener orden si no son ambos booleanos
                });
            } else {
                possibleValues.sort(); // Ordenar alfabéticamente/numéricamente
            }

            possibleValues.forEach(attrValue => {
                const questionButton = document.createElement('button');
                let buttonText = '';

                const formattedKey = formatAttributeKey(attrKey); // Formato para la UI

                if (typeof attrValue === 'boolean') {
                    if (attrValue === true) {
                        buttonText = `¿Tiene ${formattedKey}?`;
                    } else { // attrValue es false
                        buttonText = `¿NO tiene ${formattedKey}?`;
                    }
                } else {
                    // Para otros tipos de atributos (string, enum)
                    buttonText = `¿Tiene ${formattedKey} ${attrValue}?`;
                }

                questionButton.textContent = buttonText;
                questionButton.classList.add('question-button');

                questionButton.addEventListener('click', () => {
                    // Pasar todos los parámetros necesarios
                    handleQuestionClick(attrKey, attrValue, boardCharacters, secretCharacter);
                });

                containerElement.appendChild(questionButton);
            });
        }
    }
}

/**
 * Formatea una clave de atributo (camelCase de la DB) a un texto más legible en español.
 * Las claves aquí DEBEN COINCIDIR EXACTAMENTE con las claves en tu schema de Mongoose bajo 'attributes'.
 *
 * @param {string} key - La clave del atributo del objeto Character.attributes (ej: "hasGlasses", "hairColor").
 * @returns {string} La clave formateada (ej: "gafas", "color de pelo").
 */
function formatAttributeKey(key) {
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
        'isAthete': 'es atleta',
        'isMusician': 'es músico/a',
        'hasScars': 'cicatrices',
        'isBald': 'calvicie',
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
        // --- ATRIBUTOS ESPECÍFICOS PARA GEOGRAFÍA ---
        'type': 'tipo',
        'isManMade': 'es hecho por el hombre',
        'isHistorical': 'es histórico',
        'isIconic': 'es icónico',
        'dominantColor': 'color dominante',
        'heightCategory': 'categoría de altura',
        'waterFeatureNearby': 'característica de agua cercana',
        'vegetationPresent': 'vegetación presente',
        'tourismAttraction': 'atracción turística',
        // 'historicalImpact': 'impacto histórico' // Si quieres preguntar sobre esto
        // 'timePeriod': 'período de tiempo' // Si quieres preguntar sobre esto
    };
    // Devuelve la traducción si existe, de lo contrario, intenta "humanizar" camelCase
    return translations[key] || key.replace(/([A-Z])/g, ' $1').toLowerCase();
}

/**
 * Maneja el clic en un botón de pregunta, filtrando y "volteando" las cartas en el tablero.
 *
 * @param {string} attrKey - La clave del atributo que se está preguntando (ej: "hasGlasses").
 * @param {*} attrValue - El valor del atributo que se está preguntando (ej: true, "Rubio").
 * @param {Array<Object>} currentBoardCharacters - El array de personajes actualmente visibles en el tablero.
 * @param {Object} currentSecretCharacter - El personaje secreto que se debe adivinar.
 */
function handleQuestionClick(attrKey, attrValue, currentBoardCharacters, currentSecretCharacter) {
    console.log(`Pregunta: ¿Tiene ${formatAttributeKey(attrKey)} ${attrValue}?`);

    let charactersToFlip = []; // IDs de personajes que deben ser descartados

    // Acceder a los atributos del secreto desde el objeto 'attributes'
    const secretAttributeValue = currentSecretCharacter.attributes ? currentSecretCharacter.attributes[attrKey] : undefined;

    // Comprobar si el personaje secreto tiene el atributo con el valor preguntado
    const secretHasAttribute = secretAttributeValue === attrValue;
    console.log(`El personaje secreto ${secretHasAttribute ? 'SÍ' : 'NO'} tiene ${formatAttributeKey(attrKey)} ${attrValue}.`);

    // Iterar sobre todos los personajes del tablero para decidir cuáles voltear
    currentBoardCharacters.forEach(char => {
        // Acceder a los atributos del personaje del tablero desde el objeto 'attributes'
        const charAttributeValue = char.attributes ? char.attributes[attrKey] : undefined;
        const charHasAttribute = charAttributeValue === attrValue;

        // Lógica de descarte: Voltear si la característica del personaje NO COINCIDE con la del secreto
        if (secretHasAttribute !== charHasAttribute) {
            charactersToFlip.push(char._id);
        }
    });

    console.log('IDs de personajes a voltear:', charactersToFlip);

    // Voltear las cartas usando la función toggleCard de game.js (que debería ser global)
    charactersToFlip.forEach(id => {
        if (typeof toggleCard === 'function') {
            toggleCard(id);
        } else {
            console.error('La función toggleCard no está definida. Asegúrate de que game.js la exponga globalmente.');
        }
    });

    // Contar cartas restantes, detectar fin de juego, etc.
    const remainingCards = document.querySelectorAll('.character-card:not(.flipped)').length;
    console.log(`Cartas restantes: ${remainingCards}`);

    if (remainingCards === 1) {
        alert('¡Solo queda una carta! ¡Es hora de adivinar!');
    } else if (remainingCards === 0) {
        alert('¡Ups! No quedan cartas. Algo salió mal o perdiste el personaje secreto.');
    }
}