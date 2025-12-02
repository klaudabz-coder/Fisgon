const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../../database');

// Mapeo de cartas a Emojis Unicode
const EMOJIS_CARTAS = {
    '♠': { 'A': '🂡', '2': '🂢', '3': '🂣', '4': '🂤', '5': '🂥', '6': '🂦', '7': '🂧', '8': '🂨', '9': '🂩', '10': '🂪', 'J': '🂫', 'Q': '🂭', 'K': '🂮' },
    '♥': { 'A': '🂱', '2': '🂲', '3': '🂳', '4': '🂴', '5': '🂵', '6': '🂶', '7': '🂷', '8': '🂸', '9': '🂹', '10': '🂺', 'J': '🂻', 'Q': '🂽', 'K': '🂾' },
    '♦': { 'A': '🃁', '2': '🃂', '3': '🃃', '4': '🃄', '5': '🃅', '6': '🃆', '7': '🃇', '8': '🃈', '9': '🃉', '10': '🃊', 'J': '🃋', 'Q': '🃍', 'K': '🃎' },
    '♣': { 'A': '🃑', '2': '🃒', '3': '🃓', '4': '🃔', '5': '🃕', '6': '🃖', '7': '🃗', '8': '🃘', '9': '🃙', '10': '🃚', 'J': '🃛', 'Q': '🃝', 'K': '🃞' }
};
const CARTA_OCULTA = '🂠'; // Emoji de reverso de carta

function crearMazo() {
    const valores = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const palos = ['♠', '♥', '♦', '♣'];
    const mazo = [];
    for (const v of valores) {
        for (const p of palos) {
            mazo.push({ valor: v, palo: p });
        }
    }
    return mazo.sort(() => Math.random() - 0.5);
}

function calcularMano(mano) {
    let total = 0;
    let ases = 0;
    for (const carta of mano) {
        if (['J', 'Q', 'K'].includes(carta.valor)) {
            total += 10;
        } else if (carta.valor === 'A') {
            ases++;
            total += 11;
        } else {
            total += parseInt(carta.valor);
        }
    }
    while (total > 21 && ases > 0) {
        total -= 10;
        ases--;
    }
    return total;
}

function mostrarCartas(mano, ocultarPrimera = false) {
    // Convierte los objetos carta a sus emojis correspondientes
    if (ocultarPrimera) {
        const cartasVisibles = mano.slice(1).map(c => EMOJIS_CARTAS[c.palo][c.valor]).join(' ');
        return `${CARTA_OCULTA} ${cartasVisibles}`;
    }
    return mano.map(c => EMOJIS_CARTAS[c.palo][c.valor]).join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Juega una mano de blackjack contra la banca')
        .addIntegerOption(i => i.setName('cantidad').setDescription('Cantidad a apostar').setRequired(true)),
    
    async execute(interaction) {
        const cantidad = interaction.options.getInteger('cantidad');
        if (cantidad <= 0) return interaction.reply({ content: 'Cantidad inválida.', ephemeral: true });

        const balance = db.getBalance(interaction.guild.id, interaction.user.id);
        if (balance < cantidad) return interaction.reply({ content: 'No tienes suficiente saldo.', ephemeral: true });

        // Descontar apuesta inicial
        db.addBalance(interaction.guild.id, interaction.user.id, -cantidad);

        // Iniciar juego
        let mazo = crearMazo();
        let jugador = [mazo.pop(), mazo.pop()];
        let banca = [mazo.pop(), mazo.pop()];
        let finalizado = false;

        // Calcular valor visible del dealer (la segunda carta es la visible, índice 1)
        const valorVisibleDealer = calcularMano([banca[1]]);

        // Crear Embed Inicial
        const embed = new EmbedBuilder()
            .setAuthor({ name: `Blackjack de ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setColor('#2f3136') 
            .addFields(
                { name: 'Tu Mano', value: `${mostrarCartas(jugador)}\nValor: **${calcularMano(jugador)}**`, inline: true },
                // AQUI MOSTRAMOS EL VALOR DE LA CARTA VISIBLE
                { name: 'Mano del Dealer', value: `${mostrarCartas(banca, true)}\nValor: **${valorVisibleDealer}**`, inline: true }
            )
            .setFooter({ text: `Apuesta: ${cantidad} monedas` });

        // Botones
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('hit').setLabel('Pedir').setEmoji('🃏').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('stand').setLabel('Plantarse').setEmoji('🛑').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('double').setLabel('Doblar').setEmoji('💰').setStyle(ButtonStyle.Secondary)
            );

        const mensaje = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        // Colector de interacciones
        const filter = i => i.user.id === interaction.user.id;
        const collector = mensaje.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (finalizado) return;
            
            let accion = i.customId;

            if (accion === 'hit') {
                jugador.push(mazo.pop());
                const valorJugador = calcularMano(jugador);

                if (valorJugador > 21) {
                    finalizado = true;
                    embed.setColor('#ed4245') // Rojo
                        .setFields(
                            { name: 'Tu Mano', value: `${mostrarCartas(jugador)}\nValor: **${valorJugador}**`, inline: true },
                            { name: 'Mano del Dealer', value: `${mostrarCartas(banca)}\nValor: **${calcularMano(banca)}**`, inline: true }
                        )
                        .setDescription('💥 **¡Te pasaste! Has perdido.**');
                    await i.update({ embeds: [embed], components: [] });
                    collector.stop();
                } else {
                    // Calculamos de nuevo el valor visible por si acaso (aunque no cambia en hit)
                    const valorVisibleDealerActual = calcularMano([banca[1]]);
                    embed.setFields(
                        { name: 'Tu Mano', value: `${mostrarCartas(jugador)}\nValor: **${valorJugador}**`, inline: true },
                        { name: 'Mano del Dealer', value: `${mostrarCartas(banca, true)}\nValor: **${valorVisibleDealerActual}**`, inline: true }
                    );
                    // Quitamos botón de doblar después del primer movimiento
                    const newRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('hit').setLabel('Pedir').setEmoji('🃏').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('stand').setLabel('Plantarse').setEmoji('🛑').setStyle(ButtonStyle.Success)
                    );
                    await i.update({ embeds: [embed], components: [newRow] });
                }

            } else if (accion === 'stand' || accion === 'double') {
                let apuestaFinal = cantidad;
                
                if (accion === 'double') {
                    const currentBal = db.getBalance(interaction.guild.id, interaction.user.id);
                    if (currentBal < cantidad) {
                        return i.reply({ content: 'No tienes suficiente dinero para doblar.', ephemeral: true });
                    }
                    db.addBalance(interaction.guild.id, interaction.user.id, -cantidad);
                    apuestaFinal = cantidad * 2;
                    jugador.push(mazo.pop()); // Doblar solo da 1 carta más
                }

                // Turno del Dealer
                let valorBanca = calcularMano(banca);
                while (valorBanca < 17) {
                    banca.push(mazo.pop());
                    valorBanca = calcularMano(banca);
                }

                const valorJugador = calcularMano(jugador);
                finalizado = true;
                let resultadoTexto = '';
                let colorEmbed = '#2f3136';

                // Determinar Ganador
                if (valorJugador > 21) {
                     resultadoTexto = '💥 **¡Te pasaste! Has perdido.**';
                     colorEmbed = '#ed4245'; // Rojo
                } else if (valorBanca > 21 || valorJugador > valorBanca) {
                    db.addBalance(interaction.guild.id, interaction.user.id, apuestaFinal * 2);
                    resultadoTexto = `🎉 **¡Ganaste! Recibes ${apuestaFinal * 2} monedas.**`;
                    colorEmbed = '#57f287'; // Verde
                } else if (valorJugador === valorBanca) {
                    db.addBalance(interaction.guild.id, interaction.user.id, apuestaFinal);
                    resultadoTexto = '🤝 **Empate. Recuperas tu apuesta.**';
                    colorEmbed = '#fee75c'; // Amarillo
                } else {
                    resultadoTexto = '📉 **La casa gana.**';
                    colorEmbed = '#ed4245'; // Rojo
                }

                embed.setColor(colorEmbed)
                    .setFields(
                        { name: 'Tu Mano', value: `${mostrarCartas(jugador)}\nValor: **${valorJugador}**`, inline: true },
                        { name: 'Mano del Dealer', value: `${mostrarCartas(banca)}\nValor: **${valorBanca}**`, inline: true }
                    )
                    .setDescription(resultadoTexto)
                    .setFooter({ text: `Apuesta Final: ${apuestaFinal} monedas` });

                await i.update({ embeds: [embed], components: [] });
                collector.stop();
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time' && !finalizado) {
                embed.setDescription('⏰ **Tiempo agotado. Juego cancelado (pierdes la apuesta).**');
                interaction.editReply({ embeds: [embed], components: [] });
            }
        });
    }
};