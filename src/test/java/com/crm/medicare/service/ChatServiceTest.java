package com.crm.medicare.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crm.medicare.dto.ChatChannelDto;
import com.crm.medicare.dto.ChatDirectCreateRequest;
import com.crm.medicare.dto.ChatMessageCreateRequest;
import com.crm.medicare.dto.ChatMessageDto;
import com.crm.medicare.entity.ChatChannel;
import com.crm.medicare.entity.ChatChannelType;
import com.crm.medicare.entity.RoleUtilisateur;
import com.crm.medicare.entity.Utilisateur;
import com.crm.medicare.repository.ChatChannelRepository;
import com.crm.medicare.repository.ChatMessageRepository;
import com.crm.medicare.repository.UtilisateurRepository;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChatServiceTest {

    @Autowired private ChatService chatService;
    @Autowired private UtilisateurRepository utilisateurRepository;
    @Autowired private ChatChannelRepository chatChannelRepository;
    @Autowired private ChatMessageRepository chatMessageRepository;

    private Utilisateur alice;
    private Utilisateur bob;

    @BeforeEach
    void setUp() {
        alice = saveUser("Alice Chat", "alice.chat@test.local", RoleUtilisateur.SECRETARIAT);
        bob = saveUser("Bob Chat", "bob.chat@test.local", RoleUtilisateur.RADIOLOGUE);
        seedGroup("accueil-medecins", "Accueil - Médecins");
        seedGroup("techniciens-medecins", "Techniciens - Médecins");
        seedGroup("general", "Général");
        authenticate(alice);
    }

    @Test
    void textMessagePersistsAndIsReadable() {
        ChatMessageDto saved =
                chatService.postMessage(
                        "general", ChatMessageCreateRequest.builder().body("Bonjour équipe").build());

        assertThat(saved.getId()).isNotBlank();
        assertThat(saved.getMessageType()).isEqualTo("TEXT");
        assertThat(saved.getBody()).isEqualTo("Bonjour équipe");
        assertThat(saved.getAuthorId()).isEqualTo(String.valueOf(alice.getId()));

        var history = chatService.listMessages("general");
        assertThat(history).extracting(ChatMessageDto::getId).contains(saved.getId());
        assertThat(chatMessageRepository.count()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void imageUploadPersistsMetadata() {
        MockMultipartFile file =
                new MockMultipartFile(
                        "file",
                        "radio.jpg",
                        MediaType.IMAGE_JPEG_VALUE,
                        "fake-jpeg-bytes".getBytes(StandardCharsets.UTF_8));

        ChatMessageDto saved = chatService.uploadMessage("general", file, "Coupe axiale", null);

        assertThat(saved.getMessageType()).isEqualTo("IMAGE");
        assertThat(saved.getFileName()).isEqualTo("radio.jpg");
        assertThat(saved.getFileUrl()).contains("/api/chat/files/");
        assertThat(saved.getBody()).isEqualTo("Coupe axiale");
    }

    @Test
    void pdfUploadPersistsMetadata() {
        MockMultipartFile file =
                new MockMultipartFile(
                        "file",
                        "ordo.pdf",
                        MediaType.APPLICATION_PDF_VALUE,
                        "%PDF-1.4 fake".getBytes(StandardCharsets.UTF_8));

        ChatMessageDto saved = chatService.uploadMessage("general", file, null, null);

        assertThat(saved.getMessageType()).isEqualTo("PDF");
        assertThat(saved.getFileName()).isEqualTo("ordo.pdf");
        assertThat(saved.getMimeType()).isEqualTo("application/pdf");
    }

    @Test
    void rejectedMimeType() {
        MockMultipartFile file =
                new MockMultipartFile(
                        "file",
                        "virus.exe",
                        "application/octet-stream",
                        "xx".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> chatService.uploadMessage("general", file, null, null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(400);
    }

    @Test
    void audioUploadPersistsDuration() {
        MockMultipartFile file =
                new MockMultipartFile(
                        "file",
                        "vocal.webm",
                        "audio/webm",
                        "fake-audio-bytes-xxxxx".getBytes(StandardCharsets.UTF_8));

        ChatMessageDto saved = chatService.uploadMessage("general", file, null, 12);

        assertThat(saved.getMessageType()).isEqualTo("AUDIO");
        assertThat(saved.getDurationSeconds()).isEqualTo(12);
        assertThat(saved.getFileUrl()).contains("/api/chat/files/");
    }

    @Test
    void markReadClearsUnreadForCurrentUser() {
        authenticate(bob);
        chatService.postMessage(
                "general", ChatMessageCreateRequest.builder().body("Salut Alice").build());

        authenticate(alice);
        ChatChannelDto before =
                chatService.listChannels().stream()
                        .filter(c -> "general".equals(c.getId()))
                        .findFirst()
                        .orElseThrow();
        assertThat(before.getUnreadCount()).isGreaterThanOrEqualTo(1);

        chatService.markChannelRead("general");
        ChatChannelDto after =
                chatService.listChannels().stream()
                        .filter(c -> "general".equals(c.getId()))
                        .findFirst()
                        .orElseThrow();
        assertThat(after.getUnreadCount()).isZero();
    }

    @Test
    void nonMemberCannotReadOrWrite() {
        Utilisateur outsider =
                saveUser("Outsider", "out.chat@test.local", RoleUtilisateur.MANIPULATEUR);
        // outsider n'est pas membre du canal DM créé entre alice et bob
        ChatChannelDto dm =
                chatService.openOrCreateDirect(
                        ChatDirectCreateRequest.builder().peerUserId(bob.getId()).build());

        authenticate(outsider);
        assertThatThrownBy(() -> chatService.listMessages(dm.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(403);

        assertThatThrownBy(
                        () ->
                                chatService.postMessage(
                                        dm.getId(),
                                        ChatMessageCreateRequest.builder().body("intrusion").build()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode().value())
                .isEqualTo(403);
    }

    @Test
    void directChatIsIdempotent() {
        ChatChannelDto first =
                chatService.openOrCreateDirect(
                        ChatDirectCreateRequest.builder().peerUserId(bob.getId()).build());
        ChatChannelDto second =
                chatService.openOrCreateDirect(
                        ChatDirectCreateRequest.builder().peerUserId(bob.getId()).build());

        assertThat(first.getId()).isEqualTo(second.getId());
        assertThat(first.getType()).isEqualTo("DIRECT");
        assertThat(first.getPeerUserId()).isEqualTo(String.valueOf(bob.getId()));
    }

    @Test
    void listChannelsIncludesGroupsForMember() {
        var channels = chatService.listChannels();
        assertThat(channels).extracting(ChatChannelDto::getId).contains("general", "accueil-medecins");
    }

    private Utilisateur saveUser(String name, String email, RoleUtilisateur role) {
        return utilisateurRepository.save(
                Utilisateur.builder()
                        .nomComplet(name)
                        .email(email)
                        .motDePasse("{noop}test")
                        .role(role)
                        .enabled(true)
                        .build());
    }

    private void seedGroup(String id, String name) {
        if (chatChannelRepository.existsById(id)) {
            return;
        }
        chatChannelRepository.save(
                ChatChannel.builder()
                        .id(id)
                        .name(name)
                        .description(name)
                        .channelType(ChatChannelType.GROUP)
                        .membersCount(0)
                        .build());
    }

    private void authenticate(Utilisateur user) {
        SecurityContextHolder.getContext()
                .setAuthentication(
                        new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
}
